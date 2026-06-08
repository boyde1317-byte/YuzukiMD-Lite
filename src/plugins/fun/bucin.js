
const QUOTES = [
  "I love you not because of who you are, but because of who I am when I am with you.",
  "You are my sun, my moon, and all my stars.",
  "Every love story is beautiful, but ours is my favorite.",
  "I would walk through fire for you. Just let me admire your smile.",
  "You are the reason I believe in love.",
  "My heart beats your name in every rhythm.",
  "In a sea of people, my eyes will always search for you.",
  "You are my today and all of my tomorrows.",
  "I fell in love with the way you touched me without using your hands.",
  "You are the missing piece I have been searching for.",
];
const pluginConfig = {
  name: "bucin", alias: ["lovequote"], category: "fun",
  description: "Get a romantic/simp quote", usage: ".bucin",
  example: ".bucin", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  m.reply(`╭─〔 💕 *BUCIN QUOTE* 〕\n│\n│  _"${q}"_\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
