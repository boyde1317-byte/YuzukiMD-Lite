/**
 * Sticker Info — Plugin
 * Reads and displays metadata embedded in a WhatsApp sticker.
 * Usage: .stickerinfo  (reply to a sticker)
 */

const pluginConfig = {
  name: "stickerinfo",
  alias: ["stkinfo", "stinfo"],
  category: "tools",
  description: "Read metadata embedded in a sticker (author, pack, command trigger)",
  usage: ".stickerinfo  [reply to sticker]",
  example: ".stickerinfo",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

async function handler(m) {
  const quoted = m.quoted;
  const stickerMsg =
    quoted?.message?.stickerMessage ||
    quoted?.message?.viewOnceMessageV2?.message?.stickerMessage ||
    null;

  if (!stickerMsg) return m.reply("Reply to a sticker with .stickerinfo");

  const exif = stickerMsg.stickerSentTs
    ? `Sent at: ${new Date(stickerMsg.stickerSentTs * 1000).toLocaleString()}`
    : null;

  const animated = stickerMsg.isAnimated ? "Yes 🎞️" : "No 🖼️";
  const isAvatar  = stickerMsg.isAvatar   ? "Yes 🪞" : "No";

  // Attempt EXIF decode for pack metadata
  let packName = "Unknown", packAuthor = "Unknown", cmdTrigger = "";
  if (stickerMsg.exifPayload) {
    try {
      const raw = Buffer.from(stickerMsg.exifPayload).toString("utf8");
      const match = raw.match(/\{.*\}/s);
      if (match) {
        const obj = JSON.parse(match[0]);
        packName   = obj["sticker-pack-name"] || obj.packname  || "Unknown";
        packAuthor = obj["sticker-pack-publisher"] || obj.author || "Unknown";
        cmdTrigger = obj["android-app-store-link"] || obj["ios-app-store-link"] || obj.command || "";
      }
    } catch { /* silent */ }
  }

  const mime    = stickerMsg.mimetype || "image/webp";
  const fileLen = stickerMsg.fileLength ? `${(stickerMsg.fileLength / 1024).toFixed(1)} KB` : "Unknown";

  let txt =
    `╭─〔 🎴 *STICKER INFO* 〕\n` +
    `│\n` +
    `│  📦 *Pack:* ${packName}\n` +
    `│  ✍️ *Author:* ${packAuthor}\n` +
    `│  🎞️ *Animated:* ${animated}\n` +
    `│  🪞 *Avatar Sticker:* ${isAvatar}\n` +
    `│  📁 *MIME:* ${mime}\n` +
    `│  📏 *Size:* ${fileLen}\n`;

  if (exif) txt += `│  🕒 *${exif}*\n`;
  if (cmdTrigger) txt += `│  🔗 *Trigger Link:* ${cmdTrigger}\n`;

  txt += `│\n╰───────────────`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
