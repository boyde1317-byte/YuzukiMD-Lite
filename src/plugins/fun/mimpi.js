
const DREAMS = [
  "Falling from a height — you feel insecure about something in your life.",
  "Flying — you desire freedom and independence.",
  "Being chased — you are avoiding a problem or responsibility.",
  "Teeth falling out — you fear losing power or attractiveness.",
  "Taking an exam — you feel tested or judged by others.",
  "Being naked in public — you feel vulnerable or exposed.",
  "Finding money — unexpected fortune is coming your way.",
  "Drowning — you are overwhelmed by emotions or circumstances.",
  "Meeting a celebrity — you admire qualities that person represents.",
  "Being late — you fear missing out on an important opportunity.",
];
const pluginConfig = {
  name: "mimpi", alias: ["dream"], category: "fun",
  description: "Interpret your dream", usage: ".mimpi <dream_description>",
  example: ".mimpi I was flying", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const text = m.text.trim();
  if (!text) {
    const d = DREAMS[Math.floor(Math.random() * DREAMS.length)];
    return m.reply(`╭─〔 🌙 *DREAM INTERPRETATION* 〕\n│\n│  _${d}_\n│\n╰───────────────`);
  }
  const r = DREAMS[Math.floor(Math.random() * DREAMS.length)];
  m.reply(`╭─〔 🌙 *DREAM INTERPRETATION* 〕\n│\n│  Dream: _${text}_\n│\n│  Meaning: _${r}_\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
