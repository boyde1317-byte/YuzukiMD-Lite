
const COMPAT = [
  "💖 Soulmates — destined to be together!",
  "💕 Deep Connection — rare and beautiful.",
  "💛 Good Match — strong potential!",
  "🧡 Decent Pairing — work on communication.",
  "🤍 Neutral — could go either way.",
  "💔 Challenging — opposites attract?",
  "☠️ Disaster — run while you can!",
];
const pluginConfig = {
  name: "jodoh",
  alias: ["match", "soulmate"],
  category: "fun",
  description: "Check compatibility between two people",
  usage: ".jodoh @person1 @person2",
  example: ".jodoh @123 @456",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 10, isEnabled: true,
};
function handler(m) {
  const mentions = m.mentionedJid;
  if (mentions.length < 2) return m.reply("Usage: .jodoh @person1 @person2");
  const pct = Math.floor(Math.random() * 101);
  const bar = "█".repeat(Math.floor(pct/5)) + "░".repeat(20-Math.floor(pct/5));
  const msg = COMPAT[Math.floor(Math.random() * COMPAT.length)];
  const a = mentions[0].split("@")[0];
  const b = mentions[1].split("@")[0];
  m.reply(`╭─〔 💑 *COMPATIBILITY* 〕\n│\n│  👤 ${a}\n│     ❤️\n│  👤 ${b}\n│\n│  [${bar}] *${pct}%*\n│\n│  ${msg}\n│\n╰───────────────`, { mentions });
}
export { pluginConfig as config, handler };
