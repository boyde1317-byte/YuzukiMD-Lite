/**
 * Yuzuki MD — JPM (Mass Broadcast) System
 *
 * Ported & enhanced from Yuzuki MD's JPM broadcaster.
 * Owner command: .jpm <message>
 * Sends a styled interactive NativeFlow card to every registered user.
 */

import { loadDB } from "./database.js";
import { loadSettings } from "../settings.js";
import { NativeFlowCard } from "./yuzuki-builder.js";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Core broadcast ──────────────────────────────────────────────────────────

/**
 * Send a styled broadcast card to all users in the database.
 *
 * @param {object} sock
 * @param {string} text             — Broadcast message body
 * @param {{
 *   title?:       string,
 *   footer?:      string,
 *   ctaLabel?:    string,
 *   ctaUrl?:      string,
 *   delayMs?:     number,          — Delay between sends (default 1500ms)
 *   onProgress?:  (sent, total) => void,
 * }} opts
 * @returns {Promise<{ sent: number, failed: number, total: number }>}
 */
export async function broadcastJPM(sock, text, opts = {}) {
  const settings = loadSettings();
  const db = loadDB();
  const users = Object.keys(db.users || {});

  const {
    title    = `📢 Broadcast from ${settings.botName || "Yuzuki MD"}`,
    footer   = settings.botName || "Yuzuki MD",
    ctaLabel = "📩 Reply",
    ctaUrl   = "",
    delayMs  = 1500,
    onProgress = null,
  } = opts;

  let sent = 0, failed = 0;

  for (let i = 0; i < users.length; i++) {
    const jid = users[i];
    if (!jid.endsWith("@s.whatsapp.net")) continue;

    try {
      const card = new NativeFlowCard(sock)
        .setTitle(title)
        .setBody(text)
        .setFooter(footer)
        .setContext({
          isForwarded: true,
          forwardingScore: 9,
          forwardedNewsletterMessageInfo: {
            newsletterJid:  settings.newsletterJid  || "120363400911374213@newsletter",
            newsletterName: settings.newsletterName || footer,
            serverMessageId: Math.floor(Math.random() * 100) + 1,
          },
        });

      // Add CTA button if URL provided, otherwise a quick-reply button
      if (ctaUrl) {
        card.addCtaUrl(ctaLabel, ctaUrl);
      } else {
        card.addQuickReply(ctaLabel);
      }

      await card.send(jid);
      sent++;
    } catch {
      failed++;
    }

    if (onProgress) onProgress(sent + failed, users.length);
    await sleep(delayMs);
  }

  return { sent, failed, total: users.length };
}

/**
 * Send a plain text broadcast to all users (no interactive card).
 *
 * @param {object} sock
 * @param {string} text
 * @param {{ delayMs? }} opts
 * @returns {Promise<{ sent, failed, total }>}
 */
export async function broadcastText(sock, text, opts = {}) {
  const { delayMs = 1000 } = opts;
  const db = loadDB();
  const users = Object.keys(db.users || {});
  let sent = 0, failed = 0;

  for (const jid of users) {
    if (!jid.endsWith("@s.whatsapp.net")) continue;
    try {
      await sock.sendMessage(jid, { text });
      sent++;
    } catch {
      failed++;
    }
    await sleep(delayMs);
  }

  return { sent, failed, total: users.length };
}
