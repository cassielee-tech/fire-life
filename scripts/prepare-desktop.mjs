import { spawn } from "node:child_process";
import { cp, mkdir, readdir, rm, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const buildDir = path.join(root, "build");
const standaloneDir = path.join(buildDir, "next-standalone");
const demoDb = path.join(buildDir, "demo.db");

function run(command, args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with ${code}`));
    });
  });
}

async function pathExists(target) {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function copyPackage(source, target) {
  if (await pathExists(target)) return;
  await mkdir(path.dirname(target), { recursive: true });
  await cp(source, target, { recursive: true, dereference: true });
}

async function hoistPnpmStore() {
  const nodeModules = path.join(standaloneDir, "node_modules");
  const pnpmStore = path.join(nodeModules, ".pnpm");
  if (!(await pathExists(pnpmStore))) return;

  const entries = await readdir(pnpmStore, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === "node_modules") continue;
    const packagesDir = path.join(pnpmStore, entry.name, "node_modules");
    if (!(await pathExists(packagesDir))) continue;

    const packages = await readdir(packagesDir, { withFileTypes: true });
    for (const pkg of packages) {
      if (pkg.name.startsWith(".")) continue;
      if (pkg.name.startsWith("@")) {
        const scopeDir = path.join(packagesDir, pkg.name);
        for (const child of await readdir(scopeDir, { withFileTypes: true })) {
          await copyPackage(
            path.join(scopeDir, child.name),
            path.join(nodeModules, pkg.name, child.name),
          );
        }
      } else {
        await copyPackage(
          path.join(packagesDir, pkg.name),
          path.join(nodeModules, pkg.name),
        );
      }
    }
  }

  console.log("[desktop] flattening pnpm store into node_modules");
  await rm(pnpmStore, { recursive: true, force: true });
}

async function main() {
  const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
  const tsxBin = path.join(root, "node_modules", "tsx", "dist", "cli.mjs");
  const temporaryDb = path.join(os.tmpdir(), `fire-life-build-${process.pid}.db`);

  await rm(standaloneDir, { recursive: true, force: true });
  await rm(demoDb, { force: true });
  await mkdir(buildDir, { recursive: true });

  console.log("[desktop] building Next.js standalone output");
  await run(process.execPath, [nextBin, "build"], {
    DATABASE_PATH: temporaryDb,
  });
  await rm(temporaryDb, { force: true });
  await rm(`${temporaryDb}-wal`, { force: true });
  await rm(`${temporaryDb}-shm`, { force: true });

  console.log("[desktop] generating demo database");
  await run(process.execPath, [tsxBin, path.join(root, "src", "db", "seed.ts")], {
    DATABASE_PATH: demoDb,
  });

  const nextStandalone = path.join(root, ".next", "standalone");
  if (!(await pathExists(nextStandalone))) {
    throw new Error("未找到 .next/standalone，请确认 next.config.ts 中已开启 output: standalone");
  }

  console.log("[desktop] copying standalone server");
  await cp(nextStandalone, standaloneDir, {
    recursive: true,
    dereference: true,
  });

  await hoistPnpmStore();

  const staticDir = path.join(root, ".next", "static");
  if (await pathExists(staticDir)) {
    await cp(staticDir, path.join(standaloneDir, ".next", "static"), {
      recursive: true,
      dereference: true,
    });
  }

  const publicDir = path.join(root, "public");
  if (await pathExists(publicDir)) {
    await cp(publicDir, path.join(standaloneDir, "public"), {
      recursive: true,
      dereference: true,
    });
  }

  const serverDataDir = path.join(standaloneDir, "data");
  if (await pathExists(serverDataDir)) {
    console.warn("[desktop] removing traced data directory from standalone output");
    await rm(serverDataDir, { recursive: true, force: true });
  }

  const prebuildSource = path.join(root, "node_modules", "better-sqlite3", "prebuilds");
  let prebuildTarget = null;
  const directTarget = path.join(
    standaloneDir,
    "node_modules",
    "better-sqlite3",
    "prebuilds",
  );
  if (await pathExists(directTarget)) {
    prebuildTarget = directTarget;
  } else {
    const pnpmDir = path.join(standaloneDir, "node_modules", ".pnpm");
    if (await pathExists(pnpmDir)) {
      const entries = await readdir(pnpmDir);
      const matched = entries.find((entry) => entry.startsWith("better-sqlite3@"));
      if (matched) {
        prebuildTarget = path.join(
          pnpmDir,
          matched,
          "node_modules",
          "better-sqlite3",
          "prebuilds",
        );
      }
    }
  }

  if (prebuildTarget && (await pathExists(prebuildSource))) {
    console.log("[desktop] copying better-sqlite3 prebuilt binaries");
    await cp(prebuildSource, prebuildTarget, {
      recursive: true,
      dereference: true,
      force: true,
    });
  } else if (!(await pathExists(prebuildTarget ?? ""))) {
    console.warn("[desktop] better-sqlite3 prebuilds are missing from the standalone output");
  }

  if (!existsSync(demoDb)) {
    throw new Error("演示数据库生成失败");
  }

  console.log(`[desktop] ready: ${standaloneDir}`);
  console.log(`[desktop] demo database: ${demoDb}`);
}

main().catch((error) => {
  console.error(`[desktop] ${error instanceof Error ? error.message : error}`);
  process.exit(1);
});
