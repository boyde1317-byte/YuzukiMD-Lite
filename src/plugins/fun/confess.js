
const pluginConfig = {
  name: "confess",
  alias: ["confession"],
  category: "fun",
  description: "Send an anonymous confession",
  usage: ".confess <message>",
  example: ".confess I like you",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 30, isEnabled: true,
};
function handler(m) {
  const text = m.text.trim();
  if (!text) return m.reply("Usage: .confess <message>");
  m.reply(`╭─〔 💌 *CONFESSION* 〕\n│\n│  _"${text}"_\n│\n│  From: *Anonymous* 🎭\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
