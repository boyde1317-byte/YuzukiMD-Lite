
const pluginConfig = {
  name: "cekgamer",
  alias: ["gamer"],
  category: "fun",
  description: "Check your gamer level",
  usage: ".cekgamer",
  example: ".cekgamer",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, isEnabled: true,
};
function handler(m) {
  const pct = Math.floor(Math.random() * 101);
  const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20-Math.floor(pct/5));
  const label = pct >= 90 ? "🎮 Pro Gamer" : pct >= 70 ? "🕹️ Hardcore" : pct >= 40 ? "👾 Casual" : "📱 Mobile Only";
  let target = m.pushName;
  if (m.quoted) target = m.quoted.pushName || m.quoted.sender.split("@")[0];
  else if (m.mentionedJid?.[0]) target = m.mentionedJid[0].split("@")[0];
  m.reply(`╭─〔 🎮 *GAMER CHECK* 〕\n│\n│  👤 *Name:* ${target}\n│\n│  ${label}\n│  [${bar}] *${pct}%*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
