
import { createCanvas, loadImage } from "@napi-rs/canvas";
import fs from "fs";
import path from "path";
import axios from "axios";
// ASSET_DIR removed — all assets now URL-based via src/assets.js
const BG_URL = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/52e39f-1773064858080.jpg";
const FONT_URL = "https://raw.githubusercontent.com/uploader762/dat2/main/uploads/49bbd8-1773045557233.otf";
const FONT2_URL = "https://raw.githubusercontent.com/uploader762/dat1/main/uploads/203827-1773063086445.ttf";
async function ensureFile(url, file) {
    if (!fs.existsSync(path.dirname(file))) fs.mkdirSync(path.dirname(file), { recursive: true });
    if (!fs.existsSync(file)) {
        const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000 });
        fs.writeFileSync(file, Buffer.from(res.data));
    }
}
const pluginConfig = {
  name: "fakebankjago", alias: ["fakebank", "bankjago"], category: "canvas",
  description: "Generate a fake Bank Jago balance screenshot", usage: ".fakebankjago <name>,<amount>",
  example: ".fakebankjago John,15000000", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  const [nama, nominal] = m.text?.split(",");
  if (!nama || !nominal) return m.reply("Usage: .fakebankjago <name>,<amount>\nExample: .fakebankjago John,15000000");
  await m.react("🏦");
  const font1 = "./data/Demo_fonts/Fontspring-DEMO-ceraroundpro-medium.otf";
  const font2 = "./data/Roboto_Medium.ttf";
  try {
    await ensureFile(FONT_URL, font1);
    await ensureFile(FONT2_URL, font2);
  } catch {}
  try {
    const bgRes = await axios.get(BG_URL, { responseType: "arraybuffer", timeout: 15000 });
    const bg = await loadImage(Buffer.from(bgRes.data));
    const canvas = createCanvas(bg.width, bg.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bg, 0, 0, bg.width, bg.height);
    ctx.font = '125px "Arial"';
    ctx.fillStyle = "black";
    const numStr = nominal.toString();
    const numW = ctx.measureText(numStr).width;
    const baseX = 2470;
    const baseY = 894;
    const numX = baseX - numW;
    ctx.fillText(numStr, numX, baseY);
    const rpStr = "Rp";
    const rpW = ctx.measureText(rpStr).width;
    ctx.fillText(rpStr, numX - rpW - 4, baseY);
    ctx.font = '93px "Arial"';
    ctx.fillStyle = "gray";
    ctx.fillText(`Hi, ${nama}`, 98, 86);
    const buf = await canvas.encode("png");
    await m.sendMessage(m.from, { image: buf, caption: `🏦 *Fake Bank Jago*\n_Name: ${nama}_` });
  } catch (err) {
    m.reply("❌ Failed to generate image. Try again later.");
  }
}
export { pluginConfig as config, handler };
