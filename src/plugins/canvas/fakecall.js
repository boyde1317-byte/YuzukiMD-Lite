
import { createCanvas, loadImage } from "@napi-rs/canvas";
import axios from "axios";
const BG_URL = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/52e39f-1773064858080.jpg";
const pluginConfig = {
  name: "fakecall", alias: ["fcall"], category: "canvas",
  description: "Generate a fake incoming call screenshot", usage: ".fakecall <name>",
  example: ".fakecall Mom", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  const nama = m.text.trim();
  if (!nama) return m.reply("Usage: .fakecall <name>\nExample: .fakecall Mom");
  await m.react("📞");
  try {
    const bgRes = await axios.get("https://i.imgur.com/TuItj4L.png", { responseType: "arraybuffer", timeout: 10000 });
    const bg = await loadImage(Buffer.from(bgRes.data));
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0);
    ctx.font = '60px "Arial"';
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.fillText(nama, canvas.width / 2, canvas.height / 2);
    const buf = await canvas.encode("png");
    await m.sendMessage(m.from, { image: buf, caption: `📞 *Fake Call*\n_From: ${nama}_` });
  } catch {
    m.reply("❌ Failed to generate image.");
  }
}
export { pluginConfig as config, handler };
