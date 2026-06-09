/**
 * Yuzuki Plugin Compatibility Layer for Yuzuki MD
 * Wraps Yuzuki's APIs to match Yuzuki's m-style message API.
 */

import { loadDB, saveDB, addXP } from "./database.js";
import { loadSettings } from "../settings.js";

/**
 * Create an Yuzuki-style message object from Yuzuki's raw msg + context.
 */
export function createMessageObject(msg, { sock, jid, senderJid, pushname, args, command, prefix }) {
  const text = args.join(" ").trim();

  const m = {
    key: msg.key,
    sender: senderJid,
    from: jid,
    pushName: pushname ?? "User",
    text,
    body: `${prefix}${command} ${text}`.trim(),
    command,
    args,
    isGroup: jid.endsWith("@g.us"),
    isPrivate: !jid.endsWith("@g.us"),
    fromMe: msg.key.fromMe ?? false,
    participant: msg.key.participant ?? senderJid,
    quoted: extractQuoted(msg),
    mentionedJid: extractMentions(text),

    // Yuzuki-style reply method
    async reply(text, opts = {}) {
      try {
        return await sock.sendMessage(jid, { text, ...opts }, { quoted: msg });
      } catch (e) {
        console.error("[compat] reply failed:", e.message);
      }
    },

    // React to message
    async react(emoji) {
      try {
        return await sock.sendMessage(jid, { react: { text: emoji, key: msg.key } });
      } catch (e) {
        console.error("[compat] react failed:", e.message);
      }
    },

    // Send media
    async sendMessage(jid2, content, opts = {}) {
      try {
        return await sock.sendMessage(jid2 || jid, content, { ...opts, quoted: msg });
      } catch (e) {
        console.error("[compat] sendMessage failed:", e.message);
      }
    },

    // Download quoted media
    async download() {
      return downloadQuotedMedia(msg, sock);
    },
  };

  return m;
}

function extractQuoted(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;
  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: ctx.fromMe ?? false,
      id: ctx.stanzaId,
      participant: ctx.participant,
    },
    sender: ctx.participant ?? msg.key.remoteJid,
    pushName: ctx.pushName ?? "User",
    message: ctx.quotedMessage,
    text: ctx.quotedMessage?.conversation
      || ctx.quotedMessage?.extendedTextMessage?.text
      || "",
    mimetype: ctx.quotedMessage?.imageMessage?.mimetype
      || ctx.quotedMessage?.videoMessage?.mimetype
      || ctx.quotedMessage?.audioMessage?.mimetype
      || ctx.quotedMessage?.documentMessage?.mimetype
      || "",
    mediaMessage: ctx.quotedMessage?.imageMessage
      || ctx.quotedMessage?.videoMessage
      || ctx.quotedMessage?.audioMessage
      || ctx.quotedMessage?.documentMessage
      || null,
  };
}

function extractMentions(text) {
  if (!text) return [];
  const matches = text.match(/@(\d+)/g);
  return matches ? matches.map((m) => `${m.slice(1)}@s.whatsapp.net`) : [];
}

async function downloadQuotedMedia(msg, sock) {
  const { createRequire } = await import("module");
  const _require = createRequire(import.meta.url);
  const { downloadMediaMessage } = _require("socketon");

  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  if (!ctx?.quotedMessage) return null;

  const quotedMsg = {
    key: {
      remoteJid: msg.key.remoteJid,
      id: ctx.stanzaId,
      fromMe: ctx.fromMe ?? false,
      participant: ctx.participant,
    },
    message: ctx.quotedMessage,
  };

  try {
    return await downloadMediaMessage(quotedMsg, "buffer", {});
  } catch {
    return null;
  }
}

/**
 * Yuzuki-style database wrapper using Yuzuki's database.
 */
export const delay = (ms) => new Promise(res => setTimeout(res, ms));
export const parseMention = (text = "") => [...text.matchAll(/@([0-9]{5,16}|0)/g)].map(v => v[1] + "@s.whatsapp.net");

export function getDatabase() {
  const db = loadDB();

  return {
    users: db.users || {},
    groups: db.groups || {},
    settings: db.settings || {},

    getUser(jid) {
      if (!db.users[jid]) {
        db.users[jid] = {
          name: jid.split("@")[0],
          exp: 0,
          level: 0,
          koin: 0,
          bank: 0,
          health: 100,
          limit: 15,
          premium: false,
          registered: false,
          rpg: {},
          game: {},
          inventory: {},
          lastmining: 0,
          lastdungeon: 0,
          lastwork: 0,
          lastdaily: 0,
          lastadventure: 0,
          lastfishing: 0,
          lasthunting: 0,
          lastbeg: 0,
          badges: [],
        };
      }
      return db.users[jid];
    },

    getGroup(jid) {
      if (!db.groups) db.groups = {};
      if (!db.groups[jid]) {
        db.groups[jid] = {
          welcome: { enabled: false, text: "" },
          goodbye: { enabled: false, text: "" },
          antilink: false,
          antispam: false,
          muted: [],
        };
      }
      return db.groups[jid];
    },

    save() {
      saveDB(db);
    },
  };
}

/**
 * Yuzuki-style level-up check using Yuzuki's addXP.
 */
export async function addExpWithLevelCheck(sock, m, db, user, amount) {
  const oldLevel = user.level || 0;
  user.exp = (user.exp || 0) + amount;

  // Simple level formula: level = floor(sqrt(exp / 100))
  const newLevel = Math.floor(Math.sqrt((user.exp || 0) / 100));
  const leveled = newLevel > oldLevel;
  user.level = newLevel;

  if (leveled) {
    db.save();
  }

  return { leveled, oldLevel, newLevel };
}

/**
 * Check cooldown for a user on a specific command.
 */
export function checkCooldown(user, commandKey, cooldownSeconds) {
  const now = Date.now();
  const key = `cd_${commandKey}`;
  if (!user.cooldowns) user.cooldowns = {};

  const last = user.cooldowns[key] || 0;
  const elapsed = (now - last) / 1000;

  if (elapsed < cooldownSeconds) {
    const remaining = Math.ceil(cooldownSeconds - elapsed);
    return { ok: false, remaining };
  }

  user.cooldowns[key] = now;
  return { ok: true, remaining: 0 };
}

/**
 * Format numbers with Indonesian locale (Yuzuki style).
 */
export function formatKoin(n) {
  return `Rp ${(n || 0).toLocaleString("id-ID")}`;
}

/**
 * Get bot config (merged from settings).
 */
export function getConfig() {
  const settings = loadSettings();
  return {
    prefix: settings.prefix ?? ".",
    botName: settings.botName ?? "Yuzuki MD",
    ownerNumber: settings.ownerNumber ?? "",
    mode: settings.mode ?? "public",
  };
}
