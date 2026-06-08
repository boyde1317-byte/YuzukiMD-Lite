
import axios from "axios";
const pluginConfig = {
  name: "ssweb2", alias: ["screenshot2"], category: "tools",
  description: "Take a screenshot of a website", usage: ".ssweb2 <url>",
  example: ".ssweb2 https://google.com", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, isEnabled: true,
};
async function handler(m) {
  const url = m.text.trim();
  if (!url) return m.reply("Usage: .ssweb2 <url>");
  await m.react("📸");
  try {
    const ssUrl = `https://image.thum.io/get/width/1200/crop/800/noanimate/${encodeURIComponent(url)}`;
    const res = await axios.get(ssUrl, { responseType: "arraybuffer", timeout: 30000 });
    await m.sendMessage(m.from, { image: Buffer.from(res.data), caption: `📸 Screenshot of ${url}` });
  } catch {
    m.reply("❌ Failed to take screenshot.");
  }
}
export { pluginConfig as config, handler };
