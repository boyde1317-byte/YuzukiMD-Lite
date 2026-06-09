// ╔══════════════════════════════════════════════════════════╗
// ║  src/menu.js — Edit this file to customise your menu    ║
// ║  No need to touch commands.js for menu changes.         ║
// ╚══════════════════════════════════════════════════════════╝

import { fileURLToPath } from "url";
// Local background image — lives in src/assets/ alongside future bot images
export const MENU_BG = fileURLToPath(new URL("./assets/menu_bg.jpg", import.meta.url));

export const CATEGORIES = {
  ai: {
    icon: "🌸",
    title: "𝐀𝐈 𝐌𝐞𝐧𝐮",
    commands: [
      "chatgpt", "gemini", "claude",
      "imagine", "dalle", "aiart",
      "detect", "caption", "remini",
      "enhance", "summarize", "translate",
      "mathgpt", "feloai", "chatexai",
    ],
  },
  downloader: {
    icon: "🌸",
    title: "𝐃𝐨𝐰𝐧𝐥𝐨𝐚𝐝𝐞𝐫 𝐌𝐞𝐧𝐮",
    commands: [
      "ytmp3", "ytmp4", "mp3",
      "mp4", "tiktok", "tt",
      "ttmusic", "igdl", "instagram",
      "spotifydl", "spotify", "pinterest",
      "capcut", "fbdl", "githubdl",
    ],
  },
  fun: {
    icon: "🌸",
    title: "𝐅𝐮𝐧 𝐌𝐞𝐧𝐮",
    commands: [
      "meme", "joke", "quote",
      "fact", "roast", "ship",
      "truth", "dare", "8ball",
      "horoscope", "rizz", "pickup",
      "cekkhodam", "cekberat", "cekganteng",
      "cekcantik", "cekbucin", "cekgamer",
      "cekkaya", "cekwibu", "ceksabar",
      "cekhoki", "confess", "jodoh",
      "bucin", "rate", "mimpi",
    ],
  },
  game: {
    icon: "🌸",
    title: "𝐆𝐚𝐦𝐞 𝐌𝐞𝐧𝐮",
    commands: [
      "ttt", "chess", "wordle",
      "trivia", "math", "guess",
      "coinflip", "dice", "hangman",
      "rps", "akinator", "blackjack",
      "werewolf", "tictactoe2", "dicegame",
    ],
  },
  general: {
    icon: "🌸",
    title: "𝐆𝐞𝐧𝐞𝐫𝐚𝐥 𝐌𝐞𝐧𝐮",
    commands: [
      "menu", "ping", "alive",
      "uptime", "owner", "speed",
      "vpsinfo", "help", "totalcmds",
      "runtime", "donate", "infobot",
      "mylimit", "pluginstats", "plugins",
    ],
  },
  group: {
    icon: "🌸",
    title: "𝐆𝐫𝐨𝐮𝐩 𝐌𝐞𝐧𝐮",
    commands: [
      "kick", "add", "promote",
      "demote", "mute", "unmute",
      "tagall", "link", "revoke",
      "setdesc", "setname", "groupinfo",
      "welcome", "left",
    ],
  },
  owner: {
    icon: "👑",
    title: "𝐎𝐰𝐧𝐞𝐫 𝐌𝐞𝐧𝐮",
    commands: [
      "setprefix", "setowner", "addowner",
      "delowner", "setbotname", "public",
      "self", "onlygc", "onlypc",
      "antidelete", "broadcast", "jpm",
      "announce", "forward", "restart",
      "clearsession", "block", "unblock",
      "setlimit",
    ],
  },
  protect: {
    icon: "🌸",
    title: "𝐏𝐫𝐨𝐭𝐞𝐜𝐭𝐢𝐨𝐧 𝐌𝐞𝐧𝐮",
    commands: [
      "antilinkall", "antilinkgc", "antilinkch",
      "antilinktt", "antilinkig", "antilinkyt",
      "antilinkfb", "antilinktw", "antiwame",
      "antitoxic", "addbadword", "delbadword",
      "listbadword", "setantilink",
    ],
  },
  profile: {
    icon: "🌸",
    title: "𝐏𝐫𝐨𝐟𝐢𝐥𝐞 𝐌𝐞𝐧𝐮",
    commands: [
      "reg", "rank", "xp",
      "bal", "daily", "work",
      "mine", "dungeon", "heal",
      "deposit", "withdraw", "transfer",
      "leaderboard", "top", "badge",
      "bio", "setbio", "gift",
      "redeem", "pp", "setpp",
    ],
  },
  rpg: {
    icon: "🌸",
    title: "𝐑𝐏𝐆 𝐌𝐞𝐧𝐮",
    commands: [
      "adventure", "fishing", "hunt",
      "mine", "heal", "inventory",
      "shop", "sellall", "pet",
      "daily2", "beg", "work2",
    ],
  },
  canvas: {
    icon: "🎨",
    title: "𝐂𝐚𝐧𝐯𝐚𝐬 𝐌𝐞𝐧𝐮",
    commands: [
      "fakebankjago", "fakecall", "toblack",
      "tochibi", "gura", "iqc2",
      "carbon", "otp", "ppround",
    ],
  },
  store: {
    icon: "🏪",
    title: "𝐒𝐭𝐨𝐫𝐞 𝐌𝐞𝐧𝐮",
    commands: [
      "addlist", "storelist", "buy",
    ],
  },
  maker: {
    icon: "🌸",
    title: "𝐌𝐚𝐤𝐞𝐫 𝐌𝐞𝐧𝐮",
    commands: [
      "brat", "bratvid", "qc",
      "iqc", "sticker", "stiker",
      "tosticker", "toimg", "dafont",
    ],
  },
  search: {
    icon: "🌸",
    title: "𝐒𝐞𝐚𝐫𝐜𝐡 𝐌𝐞𝐧𝐮",
    commands: [
      "google", "ytsearch", "wiki",
      "imgsearch", "weather", "news",
      "lyrics", "define", "urban",
      "anime", "manga", "github",
      "spotify", "pinterest", "google2",
      "lyrics2",
    ],
  },
  tools: {
    icon: "🔧",
    title: "𝐓𝐨𝐨𝐥𝐬 𝐌𝐞𝐧𝐮",
    commands: [
      "sticker", "toimg", "tts",
      "stt", "qr", "readqr",
      "short", "calc", "base64",
      "ss", "crop", "resize",
      "ocr2", "tempmail", "ssweb2",
      "qrcustom", "carbon", "stickerinfo",
      "otp", "ppround",
      "fakecontact", "fakereply", "poll",
      "fakeloc", "type", "record",
      "disappear", "carousel", "ptt", "gif",
    ],
  },
  youtube: {
    icon: "🌸",
    title: "𝐘𝐨𝐮𝐓𝐮𝐛𝐞 𝐌𝐞𝐧𝐮",
    commands: [
      "ytmp3", "ytmp4", "ytsearch",
      "ytinfo", "ytplaylist", "yttrend",
      "ytcomments", "ytlive", "ytsub",
      "ytlike",
    ],
  },
};

// ── Main menu caption (.menu with no args) ─────────────────────────────────────
// runtime: { pushname, userRank, uptimeStr, totalUsers, totalCmds, ownerNumber }
export function buildMain(botName, prefix, runtime = {}) {
  const {
    pushname = "User",
    userRank = "User 🌟",
    uptimeStr = "-",
    totalUsers = 0,
    totalCmds = 0,
    ownerNumber = "",
  } = runtime;

  const catLines = Object.entries(CATEGORIES)
    .map(([key, cat]) => `│  ${cat.icon}  *${prefix} ${key}*`)
    .join("\n");

  return (
`✨━〔 🤖 *${botName}* 〕━✨

╭─〔 👤 *𝐔𝐬𝐞𝐫 𝐈𝐧𝐟𝐨* 〕
│ 𝗡𝗮𝗺𝗲 : *${pushname}*
│ 𝗥𝗮𝗻𝗸 : *${userRank}*
╰───────────────╯

╭─〔 🤖 *𝐁𝐨𝐭 𝐈𝐧𝐟𝐨* 〕
│ 𝗣𝗿𝗲𝗳𝗶𝘅    : *${prefix}*
│ 𝗨𝗽𝘁𝗶𝗺𝗲  : *${uptimeStr}*
│ 𝗨𝘀𝗲𝗿𝘀   : *${totalUsers}*
│ 𝗙𝗲𝗮𝘁𝘂𝗿𝗲𝘀 : *${totalCmds} cmds*
╰─────────────────╯

✨━━〔 📂 *𝐂𝐚𝐭𝐞𝐠𝐨𝐫𝐢𝐞𝐬* 〕━━✨
╭──────────────╮
${catLines}
╰──────────────╯

╭─〔 💡 *𝐓𝐢𝐩𝐬* 〕
│ Type *${prefix}<category>* to open it
╰──────────────╯`
  );
}

// ── Sub-menu caption (.menu ai, .menu tools, etc.) ────────────────────────────
export function buildSub(botName, prefix, key) {
  const cat = CATEGORIES[key];
  if (!cat) return null;

  const cmdLines = cat.commands
    .map(cmd => `◦ *${prefix}${cmd}*`)
    .join("\n");

  return (
`✨━━〔 ${cat.icon} *${cat.title}* 〕━━✨

╭─〔 🔖 *𝐀𝐜𝐜𝐞𝐬𝐬 𝐊𝐞𝐲* 〕
│ Ⓕ = ꜰʀᴇᴇ  │  Ⓛ = ʟɪᴍɪᴛᴇᴅ
│ Ⓐ = ᴀᴅᴍɪɴ  │  Ⓞ = ᴏᴡɴᴇʀ
╰───────────────────╯

${cmdLines}

╭─〔 💡 *𝐓𝐢𝐩𝐬* 〕
│ Angle brackets < > are
│ not typed literally.
│ Example: *${prefix}ytmp3 url*
╰───────────────╯

> _Back: ${prefix}menu_`
  );
}

// ── WhatsApp native list-message payload (carousel) ───────────────────────────
// Returns the object to pass as { listMessage: ... } in sock.sendMessage
export function buildListPayload(botName, prefix) {
  const sections = Object.entries(CATEGORIES).map(([key, cat]) => ({
    title: `${cat.icon} ${cat.title}`,
    rows: cat.commands.slice(0, 10).map(cmd => ({
      title: `${prefix}${cmd}`,
      description: `Open ${prefix}menu ${key} for full list`,
      rowId: `menu_${key}_${cmd}`,
    })),
  }));

  return {
    text: buildMain(botName, prefix),
    footer: `Powered by YuzukiMD`,
    title: `${botName} Menu`,
    buttonText: "📂 Browse Categories",
    sections,
    listType: 1,
  };
}
