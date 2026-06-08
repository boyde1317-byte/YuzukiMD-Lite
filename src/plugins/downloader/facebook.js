
import axios from "axios";
const pluginConfig = {
  name: "fbdl", alias: ["facebookdl", "fb"], category: "downloader",
  description: "Download Facebook video", usage: ".fbdl <url>",
  example: ".fbdl https://facebook.com/...", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  const url = m.text.trim();
  if (!url || !url.includes("facebook")) return m.reply("Usage: .fbdl <facebook_url>");
  await m.react("⏳");
  try {
    const { data } = await axios.get(`https://api.botcahx.eu.org/api/download/fb?url=${encodeURIComponent(url)}&apikey=`, { timeout: 20000 });
    if (!data.result?.hd) throw new Error("No result");
    await m.sendMessage(m.from, { video: { url: data.result.hd || data.result.sd }, caption: `📘 *Facebook Download*` });
  } catch {
    m.reply("❌ Failed to download. Try again later.");
  }
}
export { pluginConfig as config, handler };
