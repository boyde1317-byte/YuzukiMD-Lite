
const pluginConfig = {
  name: "rate", alias: ["rating"], category: "fun",
  description: "Rate something out of 10", usage: ".rate <thing>",
  example: ".rate my coding skills", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, isEnabled: true,
};
function handler(m) {
  const thing = m.text.trim();
  if (!thing) return m.reply("Usage: .rate <thing>");
  const score = Math.floor(Math.random() * 11);
  const bar = "★".repeat(score) + "☆".repeat(10 - score);
  m.reply(`╭─〔 ⭐ *RATING* 〕\n│\n│  📌 ${thing}\n│  ${bar} *${score}/10*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
