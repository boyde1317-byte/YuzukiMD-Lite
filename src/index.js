// ── Auto-install missing npm packages ─────────────────────────────────────────
// Uses only Node builtins (child_process, fs) — always available.
// Runs npm install if any key dependency is missing so the panel never crashes
// on a missing package after git pull.
import { execSync }   from "child_process";
import { existsSync } from "fs";

// Packages that panel installs commonly skip — if any are missing, run npm install
const _KEY_PKGS = ["chalk", "pino", "axios", "dotenv", "figlet", "cheerio", "moment-timezone", "yt-search", "file-type", "jimp", "lodash", "@whiskeysockets/baileys"];
if (_KEY_PKGS.some(p => !existsSync(`./node_modules/${p}`))) {
  console.log("[*] Missing packages detected — running npm install...");
  try {
    execSync("npm install --no-audit --no-fund --loglevel=error --registry https://registry.npmjs.org", { stdio: "inherit" });
    console.log("[+] Dependencies installed successfully.\n");
  } catch (e) {
    console.error("[!] npm install encountered errors (bot will still try to start):", e.message);
  }
}

// Load .env if available (graceful — panels inject vars directly, no .env needed)
try { await import("dotenv/config"); } catch {}

// Graceful chalk — falls back to a pass-through proxy if not installed
function _mkChalk() { const f = (...a) => String(a[0] ?? ""); return new Proxy(f, { get: () => _mkChalk() }); }
let chalk;
try { chalk = (await import("chalk")).default; } catch { chalk = _mkChalk(); }
await import("./server.js");
const { startBot, logger } = await import("./bot.js");
const { startTempCleaner, stopTempCleaner } = await import("./lib/temp-cleaner.js");
const { startMemoryMonitor, stopMemoryMonitor } = await import("./lib/memory-monitor.js");
const { flushDB } = await import("./lib/database.js");

// ── Validate Node version ─────────────────────────────────────────────────────
const nodeVersion = parseInt(process.version.slice(1));
if (nodeVersion < 20) {
  console.error(`❌ Node 20+ required, got ${process.version}`);
  process.exit(1);
}

// ── Blue whale startup banner ─────────────────────────────────────────────────
function printBanner() {
  // ── Pixel-art bitmaps: 5 rows × N cols per letter (1=block, 0=space) ────
  const F = {
    Y: [[1,0,0,0,1],[1,0,0,0,1],[0,1,0,1,0],[0,0,1,0,0],[0,0,1,0,0]],
    U: [[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[0,1,1,1,0]],
    Z: [[1,1,1,1,1],[0,0,0,1,0],[0,0,1,0,0],[0,1,0,0,0],[1,1,1,1,1]],
    K: [[1,0,0,1,0],[1,0,1,0,0],[1,1,0,0,0],[1,0,1,0,0],[1,0,0,1,0]],
    I: [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
    M: [[1,0,0,0,1],[1,1,0,1,1],[1,0,1,0,1],[1,0,0,0,1],[1,0,0,0,1]],
    D: [[1,1,1,0],[1,0,0,1],[1,0,0,1],[1,0,0,1],[1,1,1,0]],
    ' ':[[0,0],[0,0],[0,0],[0,0],[0,0]],
  };

  const TEXT = "YUZUKI MD";
  const BLK  = "██";  // filled cell (2 chars wide)
  const SPC  = "  ";  // empty cell

  // HSL→hex so each cell gets its own hue based on (col, row) position
  const hslHex = (col, row) => {
    const h = ((col * 26) + (row * 8)) % 360;
    const s = 1, l = 0.55;
    const c2 = (1 - Math.abs(2 * l - 1)) * s;
    const x2 = c2 * (1 - Math.abs((h / 60) % 2 - 1));
    const m2 = l - c2 / 2;
    let r, g, b;
    if      (h <  60) { r=c2; g=x2; b=0;  }
    else if (h < 120) { r=x2; g=c2; b=0;  }
    else if (h < 180) { r=0;  g=c2; b=x2; }
    else if (h < 240) { r=0;  g=x2; b=c2; }
    else if (h < 300) { r=x2; g=0;  b=c2; }
    else              { r=c2; g=0;  b=x2; }
    const hex = v => Math.round((v + m2) * 255).toString(16).padStart(2, "0");
    return "#" + hex(r) + hex(g) + hex(b);
  };

  console.log();
  for (let row = 0; row < 5; row++) {
    let line = "  ";
    let col  = 0;
    for (const ch of TEXT) {
      const glyph = F[ch] ?? F[' '];
      for (const bit of glyph[row]) {
        line += bit ? chalk.hex(hslHex(col, row))(BLK) : SPC;
        col++;
      }
      col++;   // 1-cell gap between letters
      line += SPC;
    }
    console.log(line);
  }
  console.log();
  console.log("  " + chalk.bold.white("YUZUKI MD") + chalk.dim("  v2  ·  Node " + process.version));
  console.log("  " + chalk.hex("#0096ff")("github.com/boyde1317-byte/YuzukiMD-Lite"));
  console.log();
}

printBanner();

// Headless env check — warn early if PHONE_NUMBER is missing and stdin is not interactive
const _phoneEnvCheck = (process.env.PHONE_NUMBER ?? "").replace(/[^0-9]/g, "");
if (!_phoneEnvCheck && !process.stdin.isTTY) {
  console.warn(
    `\n⚠️  WARNING: PHONE_NUMBER is not set and stdin is not interactive.\n` +
    `   The bot cannot pair a device without a phone number.\n` +
    `   Set PHONE_NUMBER=<digits only> in your environment variables.\n`
  );
}

startTempCleaner();
startMemoryMonitor();

startBot().catch((err) => {
  logger.error({ err }, "Fatal error starting bot");
  setTimeout(() => process.exit(1), 2000);
});

async function _shutdown(signal) {
  logger.info(`Received ${signal}, shutting down...`);
  stopTempCleaner();
  stopMemoryMonitor();
  flushDB();
  process.exit(0);
}

process.on("SIGTERM", () => _shutdown("SIGTERM"));
process.on("SIGINT",  () => _shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled rejection — shutting down");
  process.exit(1);
});
