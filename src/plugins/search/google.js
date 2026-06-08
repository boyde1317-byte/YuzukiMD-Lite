
import axios from "axios";
const pluginConfig = {
  name: "google2", alias: ["g2", "search"], category: "search",
  description: "Search Google", usage: ".google2 <query>",
  example: ".google2 cats", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
async function handler(m) {
  const q = m.text.trim();
  if (!q) return m.reply("Usage: .google2 <query>");
  await m.react("🔍");
  try {
    const { data } = await axios.get(`https://api.botcahx.eu.org/api/search/google?query=${encodeURIComponent(q)}&apikey=`, { timeout: 15000 });
    if (!data.result?.length) return m.reply("No results found.");
    let txt = `╭─〔 🔍 *GOOGLE SEARCH* 〕\n│\n`;
    for (const r of data.result.slice(0, 5)) {
      txt += `│  *${r.title}*\n│  ${r.link}\n│\n`;
    }
    txt += `╰───────────────`;
    m.reply(txt);
  } catch {
    m.reply("❌ Search failed. Try again.");
  }
}
export { pluginConfig as config, handler };
