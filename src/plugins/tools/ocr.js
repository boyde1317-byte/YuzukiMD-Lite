
import axios from "axios";
const pluginConfig = {
  name: "ocr2", alias: ["readtext"], category: "tools",
  description: "Extract text from image (OCR)", usage: ".ocr2 [reply to image]",
  example: ".ocr2", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  if (!m.quoted || !m.quoted.mediaMessage) return m.reply("Reply to an image with .ocr2");
  await m.react("🔍");
  try {
    const buf = await m.download();
    if (!buf) return m.reply("❌ Failed to download image.");
    // Using OCR.space API (free tier)
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("file", buf, { filename: "image.png" });
    form.append("apikey", "helloworld");
    const { data } = await axios.post("https://api.ocr.space/parse/image", form, { headers: form.getHeaders(), timeout: 30000 });
    const text = data.ParsedResults?.[0]?.ParsedText || "No text detected.";
    m.reply(`╭─〔 📝 *OCR RESULT* 〕\n│\n│  _${text}_\n│\n╰───────────────`);
  } catch {
    m.reply("❌ OCR failed. Make sure the image is clear.");
  }
}
export { pluginConfig as config, handler };
