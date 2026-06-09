// ╔══════════════════════════════════════════════════════════╗
// ║  src/assets.js — Central URL map for all media assets   ║
// ║  All images/video/audio are hosted on GitHub Releases.  ║
// ║  To update a file: upload a new release asset and       ║
// ║  update the URL here.                                   ║
// ╚══════════════════════════════════════════════════════════╝

const BASE = "https://github.com/boyde1317-byte/YuzukiMD-Lite/releases/download/v1.0-assets";

export const ASSETS = {
  // ── Background & Menu ──────────────────────────────────────
  MENU_BG:           `${BASE}/menu_bg.jpg`,

  // ── Yuzuki Character Images ────────────────────────────────
  PP_KOSONG:         `${BASE}/pp-kosong.jpg`,
  ALLMENU:           `${BASE}/yuzuki-allmenu.jpg`,
  FISHIT:            `${BASE}/yuzuki-fishit.jpg`,
  GAMES:             `${BASE}/yuzuki-games.jpg`,
  KERTAS:            `${BASE}/yuzuki-kertas.jpg`,
  LANDSCAPE:         `${BASE}/yuzuki-landscape.jpg`,
  LEVELUP:           `${BASE}/yuzuki-levelup.jpg`,
  OTP:               `${BASE}/yuzuki-otp.jpg`,
  RPG:               `${BASE}/yuzuki-rpg.jpg`,
  RULES:             `${BASE}/yuzuki-rules.jpg`,
  V11:               `${BASE}/yuzuki-v11.jpg`,
  V7:                `${BASE}/yuzuki-v7.jpg`,
  V8:                `${BASE}/yuzuki-v8.jpg`,
  V9:                `${BASE}/yuzuki-v9.jpg`,
  WINNER:            `${BASE}/yuzuki-winner.jpg`,
  YUZUKI2:           `${BASE}/yuzuki2.jpg`,
  YUZUKI3:           `${BASE}/yuzuki3.jpg`,
  ZANN:              `${BASE}/zann.jpg`,

  // ── Video ──────────────────────────────────────────────────
  // Note: yuzuki-mp4.mp4 was empty in the repo — replace URL when ready
  VIDEO:             `${BASE}/yuzuki-mp4.mp4`,

  // ── Audio ──────────────────────────────────────────────────
  // Note: yuzuki-mp3.mp3 was empty in the repo — replace URL when ready
  AUDIO:             `${BASE}/yuzuki-mp3.mp3`,

  // ── Other Images ───────────────────────────────────────────
  TEST_WEBP:         `${BASE}/test.webp`,
  DAFTAR:            `${BASE}/yuzuki-daftar.png`,   // was empty — replace when ready
  DEMOTE:            `${BASE}/yuzuki-demote.png`,
  PROMOTE:           `${BASE}/yuzuki-promote.png`,
  STORE:             `${BASE}/yuzuki-store.png`,    // was empty — replace when ready
  YUZUKI_PNG:        `${BASE}/yuzuki.png`,          // was empty — replace when ready
};

export default ASSETS;
