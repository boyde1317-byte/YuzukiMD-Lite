const CATEGORIES = [
  { range: "0-30", label: "🪶 Feather Light", desc: "You float like a feather — maybe eat more rice?" },
  { range: "31-50", label: "🐇 Rabbit", desc: "Quick and light on your feet!" },
  { range: "51-65", label: "🐕 Doggo", desc: "A healthy, energetic companion." },
  { range: "66-80", label: "🐻 Bear", desc: "Strong and sturdy — a force to be reckoned with." },
  { range: "81-100", label: "🐘 Elephant", desc: "Majestic and powerful. Nothing stops you." },
  { range: "101-150", label: "🦕 Dinosaur", desc: "Ancient power dwells within you." },
  { range: "151-300", label: "🐋 Blue Whale", desc: "The largest creature on Earth — unstoppable!" },
  { range: "301-999", label: "🪐 Planet", desc: "You have your own gravitational pull." },
];

const pluginConfig = {
  name: "cekberat",
  alias: ["berat"],
  category: "fun",
  description: "Check your virtual weight",
  usage: ".cekberat",
  example: ".cekberat",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 5,
  isEnabled: true,
};

function handler(m) {
  const weight = Math.floor(Math.random() * 500) + 1;
  const cat = CATEGORIES.reverse().find((c) => {
    const [min, max] = c.range.split("-").map(Number);
    return weight >= min && weight <= max;
  }) || CATEGORIES[CATEGORIES.length - 1];

  const txt =
    `╭─〔 ⚖️ *WEIGHT CHECK* 〕\n` +
    `│\n` +
    `│  👤 *Name:* ${m.pushName}\n` +
    `│  ⚖️ *Weight:* ${weight} kg\n` +
    `│  🏷️ *Category:* ${cat.label}\n` +
    `│  💬 *${cat.desc}*\n` +
    `│\n` +
    `╰───────────────`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
