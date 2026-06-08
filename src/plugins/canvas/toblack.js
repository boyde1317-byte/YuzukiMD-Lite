
import { createCanvas, loadImage } from "@napi-rs/canvas";
const pluginConfig = {
  name: "toblack", alias: ["blackprofile"], category: "canvas",
  description: "Turn a profile picture to black & white", usage: ".toblack [reply to image]",
  example: ".toblack", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m, { sock }) {
  const quoted = m.quoted;
  if (!quoted || !quoted.mediaMessage) return m.reply("Reply to an image with .toblack");
  await m.react("🎨");
  try {
    const buf = await m.download();
    if (!buf) return m.reply("❌ Failed to download media.");
    const img = await loadImage(buf);
    const canvas = createCanvas(img.width, img.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const gray = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
      data[i] = gray; data[i+1] = gray; data[i+2] = gray;
    }
    ctx.putImageData(imageData, 0, 0);
    const out = await canvas.encode("png");
    await m.sendMessage(m.from, { image: out, caption: "🎨 *Black & White*" });
  } catch (err) {
    m.reply("❌ Failed to process image.");
  }
}
export { pluginConfig as config, handler };
