const { app, BrowserWindow, Menu, dialog, session, shell } = require("electron");
const { spawn } = require("node:child_process");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const path = require("node:path");

const APP_NAME = "Fire Life";
const DEV_URL = process.env.ELECTRON_DEV_URL;

app.setName(APP_NAME);
if (process.platform === "win32") {
  app.setAppUserModelId("com.firelife.desktop");
}

let mainWindow = null;
let appUrl = null;
let serverProcess = null;
let quitting = false;

const dataDir = () => path.join(app.getPath("userData"), "data");
const logPath = () => path.join(app.getPath("userData"), "logs", "server.log");

function log(message) {
  try {
    const file = logPath();
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `[${new Date().toISOString()}] ${message}\n`);
  } catch {
    // Logging must never crash the app.
  }
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.unref();
    probe.on("error", reject);
    probe.listen(0, "127.0.0.1", () => {
      const address = probe.address();
      const port = typeof address === "object" && address ? address.port : 0;
      probe.close(() => resolve(port));
    });
  });
}

function waitForServer(url, timeoutMs = 45000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(url, (response) => {
        response.resume();
        if (response.statusCode && response.statusCode < 500) {
          resolve();
        } else {
          retry();
        }
      });
      request.setTimeout(2500, () => request.destroy());
      request.on("error", retry);
    };
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`等待服务启动超时：${url}`));
        return;
      }
      setTimeout(attempt, 250);
    };
    attempt();
  });
}

function prepareDatabase() {
  const dbFile = path.join(dataDir(), "fire-life.db");
  if (fs.existsSync(dbFile)) return dbFile;

  fs.mkdirSync(path.dirname(dbFile), { recursive: true });
  const demoFile = path.join(app.getAppPath(), "build", "demo.db");
  if (fs.existsSync(demoFile)) {
    fs.copyFileSync(demoFile, dbFile);
    log(`copied demo database to ${dbFile}`);
  } else {
    log(`demo database not found at ${demoFile}; starting with an empty database`);
  }
  return dbFile;
}

async function startServer() {
  const standaloneDir = path.join(app.getAppPath(), "build", "next-standalone");
  const serverFile = path.join(standaloneDir, "server.js");
  if (!fs.existsSync(serverFile)) {
    throw new Error(`未找到 Next.js 服务端文件：${serverFile}`);
  }

  const dbFile = prepareDatabase();
  const port = await findFreePort();
  fs.mkdirSync(path.dirname(logPath()), { recursive: true });
  const logStream = fs.createWriteStream(logPath(), { flags: "a" });
  logStream.on("error", () => {});

  serverProcess = spawn(process.execPath, [serverFile], {
    cwd: standaloneDir,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      DATABASE_PATH: dbFile,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  serverProcess.stdout.pipe(logStream, { end: false });
  serverProcess.stderr.pipe(logStream, { end: false });

  serverProcess.on("exit", (code, signal) => {
    log(`server exited code=${code} signal=${signal}`);
    serverProcess = null;
    if (!quitting) {
      dialog.showErrorBox(
        "Fire Life 服务已停止",
        `本地服务进程异常退出（code=${code}）。请重新启动应用。\n日志：${logPath()}`,
      );
      app.quit();
    }
  });

  const url = `http://127.0.0.1:${port}`;
  log(`starting server at ${url} (db=${dbFile})`);
  await waitForServer(`${url}/`);
  return url;
}

function stopServer() {
  if (!serverProcess) return;
  log("stopping server");
  const child = serverProcess;
  serverProcess = null;
  try {
    child.kill();
  } catch (error) {
    log(`failed to stop server: ${error}`);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 880,
    minWidth: 1024,
    minHeight: 720,
    backgroundColor: "#0a0d12",
    show: false,
    title: APP_NAME,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once("ready-to-show", () => mainWindow.show());
  mainWindow.on("closed", () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, target) => {
    if (appUrl && target.startsWith(appUrl)) return;
    event.preventDefault();
    if (/^https?:/i.test(target)) void shell.openExternal(target);
  });

  return mainWindow.loadURL(appUrl);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const template = [
    ...(isMac ? [{ role: "appMenu" }] : []),
    {
      label: "文件",
      submenu: [
        {
          label: "打开数据目录",
          click: () => void shell.openPath(dataDir()),
        },
        {
          label: "打开服务日志",
          click: () => void shell.openPath(logPath()),
        },
        { type: "separator" },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    { role: "editMenu" },
    { role: "viewMenu" },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        {
          label: "关于 Fire Life",
          click: () => {
            void dialog.showMessageBox(mainWindow ?? undefined, {
              type: "info",
              title: "关于 Fire Life",
              message: `${APP_NAME} ${app.getVersion()}`,
              detail: `数据目录：${dataDir()}\n服务地址：${appUrl ?? "未启动"}`,
            });
          },
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function registerDownloadHandler() {
  session.defaultSession.on("will-download", (_event, item) => {
    item.setSaveDialogOptions({
      title: "保存文件",
      defaultPath: path.join(app.getPath("downloads"), item.getFilename()),
    });
  });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    buildMenu();
    registerDownloadHandler();
    try {
      appUrl = DEV_URL || (await startServer());
      await createWindow();
    } catch (error) {
      log(`startup failed: ${error && error.stack ? error.stack : error}`);
      dialog.showErrorBox(
        "Fire Life 启动失败",
        `${error instanceof Error ? error.message : String(error)}\n日志：${logPath()}`,
      );
      quitting = true;
      stopServer();
      app.quit();
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length > 0 || !appUrl) return;
      void createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });

  app.on("before-quit", () => {
    quitting = true;
    stopServer();
  });
}
