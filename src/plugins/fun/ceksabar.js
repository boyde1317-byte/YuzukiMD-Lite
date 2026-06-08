
const LEVELS = [
  { min: 0, max: 20, label: "💥 Volcano", emoji: "🌋" },
  { min: 21, max: 40, label: "😤 Grumpy", emoji: "😤" },
  { min: 41, max: 60, label: "😑 Neutral", emoji: "😐" },
  { min: 61, max: 80, label: "🧘 Calm", emoji: "🧘" },
  { min: 81, max: 95, label: "🕉️ Zen Master", emoji: "🕉️" },
  { min: 96, max: 100, label: "🧊 Iceberg", emoji: "🧊" },
];
const pluginConfig = {
  name: "ceksabar",
  alias: ["sabar", "patience"],
  category: "fun",
  description: "Check your patience level",
  usage: ".ceksabar",
  example: ".ceksabar",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, isEnabled: true,
};
function handler(m) {
  const pct = Math.floor(Math.random() * 101);
  const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20-Math.floor(pct/5));
  const level = LEVELS.find(l => pct >= l.min && pct <= l.max) || LEVELS[0];
  let target = m.pushName;
  if (m.quoted) target = m.quoted.pushName || m.quoted.sender.split("@")[0];
  else if (m.mentionedJid?.[0]) target = m.mentionedJid[0].split("@")[0];
  m.reply(`╭─〔 🧘 *PATIENCE CHECK* 〕\n│\n│  👤 *Name:* ${target}\n│\n│  ${level.emoji} *Level:* ${level.label}\n│  [${bar}] *${pct}%*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
