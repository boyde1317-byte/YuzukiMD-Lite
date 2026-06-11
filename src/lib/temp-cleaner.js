import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const TEMP_DIRS = ["temp", "tmp"];
const CLEAN_INTERVAL = 30 * 60 * 1000;

let cleanerTimer = null;

export function startTempCleaner() {
  if (cleanerTimer) return;

  cleanerTimer = setInterval(() => {
    let totalCleaned = 0;
    for (const dir of TEMP_DIRS) {
      const dirPath = path.join(ROOT, dir);
      if (!fs.existsSync(dirPath)) continue;
      try {
        for (const file of fs.readdirSync(dirPath)) {
          try {
            fs.unlinkSync(path.join(dirPath, file));
            totalCleaned++;
          } catch {}
        }
      } catch {}
    }
    if (totalCleaned > 0) {
      console.log(`[temp-cleaner] cleaned ${totalCleaned} file(s)`);
    }
  }, CLEAN_INTERVAL);

  if (cleanerTimer.unref) cleanerTimer.unref();
  console.log(`[temp-cleaner] active — auto-clean every ${CLEAN_INTERVAL / 60000}m`);
}

export function stopTempCleaner() {
  if (cleanerTimer) {
    clearInterval(cleanerTimer);
    cleanerTimer = null;
  }
}
