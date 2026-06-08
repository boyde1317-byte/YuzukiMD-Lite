
import axios from "axios";
const pluginConfig = {
  name: "lyrics2", alias: ["lirik", "songtext"], category: "search",
  description: "Search for song lyrics", usage: ".lyrics2 <song title>",
  example: ".lyrics2 Bohemian Rhapsody", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
async function handler(m) {
  const q = m.text.trim();
  if (!q) return m.reply("Usage: .lyrics2 <song title>");
  await m.react("🎵");
  try {
    const { data } = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(q)}`, { timeout: 15000 });
    if (!data.lyrics) throw new Error("No lyrics");
    const txt = data.lyrics.slice(0, 3500);
    m.reply(`╭─〔 🎵 *LYRICS* 〕\n│\n│  *${q}*\n│\n│  _${txt}_\n│\n╰───────────────`);
  } catch {
    m.reply("❌ Lyrics not found. Try another song.");
  }
}
export { pluginConfig as config, handler };
