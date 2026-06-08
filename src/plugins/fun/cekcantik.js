const LEVELS = [
  { min: 0,  max: 10,  label: "🥔 Potato",       emoji: "🥔" },
  { min: 11, max: 30,  label: "🐭 Mouse",        emoji: "🐭" },
  { min: 31, max: 50,  label: "🐰 Bunny",        emoji: "🐰" },
  { min: 51, max: 70,  label: "🦊 Foxy",         emoji: "🦊" },
  { min: 71, max: 85,  label: "🌸 Pretty",       emoji: "🌸" },
  { min: 86, max: 95,  label: "💎 Gorgeous",     emoji: "💎" },
  { min: 96, max: 100, label: "👑 Goddess",      emoji: "👑" },
];

const pluginConfig = {
  name: "cekcantik",
  alias: ["cantik", "beauty"],
  category: "fun",
  description: "Check your beauty level",
  usage: ".cekcantik",
  example: ".cekcantik",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
};

function handler(m) {
  const pct = Math.floor(Math.random() * 101);
  const bar = "█".repeat(Math.floor(pct / 5)) + "░".repeat(20 - Math.floor(pct / 5));
  const level = LEVELS.find((l) => pct >= l.min && pct <= l.max) || LEVELS[0];

  let target = m.pushName;
  if (m.quoted) target = m.quoted.pushName || m.quoted.sender.split("@")[0];
  else if (m.mentionedJid?.[0]) target = m.mentionedJid[0].split("@")[0];

  const txt =
    `╭─〔 🌸 *BEAUTY CHECK* 〕\n` +
    `│\n` +
    `│  👤 *Name:* ${target}\n` +
    `│\n` +
    `│  ${level.emoji} *Level:* ${level.label}\n` +
    `│  [${bar}] *${pct}%*\n` +
    `│\n` +
    `╰───────────────`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
