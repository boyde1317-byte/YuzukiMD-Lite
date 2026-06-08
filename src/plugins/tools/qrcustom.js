
import QRCode from "qrcode";
const pluginConfig = {
  name: "qrcustom", alias: ["makeqr"], category: "tools",
  description: "Create a custom QR code", usage: ".qrcustom <text>",
  example: ".qrcustom hello world", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
async function handler(m) {
  const text = m.text.trim();
  if (!text) return m.reply("Usage: .qrcustom <text>");
  await m.react("📱");
  try {
    const buf = await QRCode.toBuffer(text, { width: 400, margin: 2 });
    await m.sendMessage(m.from, { image: buf, caption: `📱 QR Code for: _${text}_` });
  } catch {
    m.reply("❌ Failed to generate QR code.");
  }
}
export { pluginConfig as config, handler };
