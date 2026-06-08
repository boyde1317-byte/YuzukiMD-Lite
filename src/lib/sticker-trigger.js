/**
 * Sticker Trigger Router
 *
 * Ported from Yuzuki MD's sticker command system.
 * When a user sends a sticker that has a command embedded in its EXIF
 * metadata, this router detects it and fires the matching command.
 *
 * How it works:
 *   - Sticker EXIF "android-app-store-link" or "command" field is set to
 *     the bot command (e.g. ".help", ".ping", ".menu")
 *   - This hook reads that field and re-dispatches to the plugin loader
 *     or Yuzuki's own command handler
 *
 * Integration: called from bot.js on every incoming sticker message.
 */

import { getPlugin } from "./plugin-loader.js";

/**
 * Extract command string from a sticker's EXIF payload.
 *
 * @param {object} stickerMessage  — Baileys stickerMessage object
 * @returns {string|null}          — command string (e.g. "help") or null
 */
export function extractStickerCommand(stickerMessage) {
  if (!stickerMessage?.exifPayload) return null;

  try {
    const raw = Buffer.from(stickerMessage.exifPayload).toString("utf8");
    const match = raw.match(/\{.*\}/s);
    if (!match) return null;

    const meta = JSON.parse(match[0]);
    const raw_cmd =
      meta["android-app-store-link"] ||
      meta["ios-app-store-link"]     ||
      meta.command                   ||
      null;

    if (!raw_cmd) return null;

    // Strip leading prefix chars (. / ! #)
    return raw_cmd.replace(/^[./!#]+/, "").trim().toLowerCase() || null;
  } catch {
    return null;
  }
}

/**
 * Handle an incoming sticker message — attempt to fire embedded command.
 *
 * @param {object} m       — Yuzuki-compat message object
 * @param {object} context — { sock, jid, senderJid, pushname, prefix }
 * @returns {Promise<boolean>}  true if a command was triggered
 */
export async function handleStickerTrigger(m, context) {
  const rawMsg = m._raw;
  const stickerMsg =
    rawMsg?.message?.stickerMessage ||
    rawMsg?.message?.viewOnceMessageV2?.message?.stickerMessage ||
    null;

  if (!stickerMsg) return false;

  const cmd = extractStickerCommand(stickerMsg);
  if (!cmd) return false;

  const plugin = getPlugin(cmd);
  if (!plugin) return false;

  try {
    // Rebuild message context with the extracted command
    const triggeredM = { ...m, command: cmd, args: [], text: "" };
    await plugin.handler(triggeredM, context);
    return true;
  } catch (err) {
    console.error(`[StickerTrigger] Error firing "${cmd}":`, err.message);
    return false;
  }
}
