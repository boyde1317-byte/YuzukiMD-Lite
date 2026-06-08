
import axios from "axios";
const pluginConfig = {
  name: "capcut", alias: ["capcutdl"], category: "downloader",
  description: "Download CapCut video", usage: ".capcut <url>",
  example: ".capcut https://www.capcut.com/...", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  const url = m.text.trim();
  if (!url || !url.includes("capcut")) return m.reply("Usage: .capcut <capcut_url>");
  await m.react("⏳");
  try {
    // Using btch-downloader API
    const { data } = await axios.get(`https://api.botcahx.eu.org/api/download/capcut?url=${encodeURIComponent(url)}&apikey=`, { timeout: 20000 });
    if (!data.result?.url) throw new Error("No result");
    await m.sendMessage(m.from, { video: { url: data.result.url }, caption: `🎬 *CapCut Download*\n_Title: ${data.result.title || "Unknown"}_` });
  } catch {
    m.reply("❌ Failed to download. The URL may be invalid or the service is down.");
  }
}
export { pluginConfig as config, handler };
