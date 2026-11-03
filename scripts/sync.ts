import { runSync } from "../src/lib/sync";

runSync()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    if (report.failures.length > 0) {
      console.error(`${report.failures.length} 个标的同步失败`);
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error("同步失败:", err);
    process.exitCode = 1;
  });
