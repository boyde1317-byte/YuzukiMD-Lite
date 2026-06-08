
const LEVELS = [
  { min: 0, max: 20, label: "👤 Normal Human", emoji: "👤" },
  { min: 21, max: 40, label: "📺 Anime Watcher", emoji: "📺" },
  { min: 41, max: 60, label: "🎌 Weeb", emoji: "🎌" },
  { min: 61, max: 80, label: "⛩️ Otaku", emoji: "⛩️" },
  { min: 81, max: 95, label: "🔥 Weeb Lord", emoji: "🔥" },
  { min: 96, max: 100, label: "👑 Ultimate Wibu", emoji: "👑" },
];
const pluginConfig = {
  name: "cekwibu",
  alias: ["wibu", "weeb"],
  category: "fun",
  description: "Check your wibu level",
  usage: ".cekwibu",
  example: ".cekwibu",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, isEnabled: true,
};
function handler(m) {
  const pct = Math.floor(Math.random() * 101);
  const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20-Math.floor(pct/5));
  const level = LEVELS.find(l => pct >= l.min && pct <= l.max) || LEVELS[0];
  let target = m.pushName;
  if (m.quoted) target = m.quoted.pushName || m.quoted.sender.split("@")[0];
  else if (m.mentionedJid?.[0]) target = m.mentionedJid[0].split("@")[0];
  m.reply(`╭─〔 ⛩️ *WIBU CHECK* 〕\n│\n│  👤 *Name:* ${target}\n│\n│  ${level.emoji} *Level:* ${level.label}\n│  [${bar}] *${pct}%*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
