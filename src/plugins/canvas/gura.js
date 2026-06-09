
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
const ASSET = path.join(process.cwd(), "src/assets/yuzuki/yuzuki.png");
const pluginConfig = {
  name: "gura", alias: ["gurastyle"], category: "canvas",
  description: "Apply Gura-style overlay to your profile picture", usage: ".gura [reply to image]",
  example: ".gura", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  if (!m.quoted && !m.mentionedJid?.[0]) return m.reply("Reply to an image or mention someone with .gura");
  await m.react("🦈");
  try {
    let buf;
    if (m.quoted && m.quoted.mediaMessage) buf = await m.download();
    else {
      const ppUrl = await m.sendMessage(m.from, { url: `https://i.imgur.com/TuItj4L.png` }, { quoted: m.key });
      buf = Buffer.from([]);
    }
    const img = await loadImage(buf || fs.readFileSync(ASSET));
    const canvas = createCanvas(500, 500);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, 500, 500);
    ctx.font = 'bold 40px "Arial"';
    ctx.fillStyle = "#00BFFF";
    ctx.textAlign = "center";
    ctx.fillText("a", 250, 480);
    const out = await canvas.encode("png");
    await m.sendMessage(m.from, { image: out, caption: "🦈 *Gura Style*" });
  } catch {
    m.reply("❌ Failed to generate image.");
  }
}
export { pluginConfig as config, handler };
