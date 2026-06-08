
import { createCanvas, loadImage } from "@napi-rs/canvas";
const pluginConfig = {
  name: "iqc2", alias: ["iqcheck"], category: "canvas",
  description: "Generate IQ check card for a user", usage: ".iqc2 [reply to image or mention]",
  example: ".iqc2", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  if (!m.quoted && !m.mentionedJid?.[0]) return m.reply("Reply to an image or mention someone with .iqc2");
  await m.react("🧠");
  const iq = Math.floor(Math.random() * 151) + 50;
  const label = iq >= 140 ? "🧠 Genius" : iq >= 120 ? "🎓 Very Smart" : iq >= 100 ? "📚 Average" : iq >= 80 ? "😐 Below Average" : "🥔 Potato";
  try {
    let buf = null;
    if (m.quoted && m.quoted.mediaMessage) buf = await m.download();
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, 500, 500);
    if (buf) {
      const img = await loadImage(buf);
      ctx.drawImage(img, 150, 50, 200, 200);
    }
    ctx.font = 'bold 40px "Arial"';
    ctx.fillStyle = "#e94560";
    ctx.textAlign = "center";
    ctx.fillText(`IQ: ${iq}`, 250, 300);
    ctx.font = '30px "Arial"';
    ctx.fillStyle = "#fff";
    ctx.fillText(label, 250, 350);
    const out = await canvas.encode("png");
    await m.sendMessage(m.from, { image: out, caption: `🧠 *IQ Check Result*` });
  } catch {
    m.reply(`🧠 *IQ Check*\n\nResult: *${iq}*\nLevel: ${label}`);
  }
}
export { pluginConfig as config, handler };
