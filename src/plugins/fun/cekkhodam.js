import { getDatabase } from "../../lib/legacy-compat.js";

const KHODAMS = [
  { name: "White Tiger", meaning: "You are strong and brave like a tiger — your ancestors passed great power to you." },
  { name: "Sleepy Lamp", meaning: "Looks sleepy but always gives warm light." },
  { name: "Toothless Panda", meaning: "You are adorable and always make people smile with your quirks." },
  { name: "Rubber Duck", meaning: "You are always calm and cheerful, able to face waves of problems with a smile." },
  { name: "Ninja Turtle", meaning: "You are agile and tough, ready to protect the weak with your combat strength." },
  { name: "Fridge Cat", meaning: "You are mysterious and always in unexpected places." },
  { name: "Fragrant Soap", meaning: "You always bring fragrance and freshness wherever you go." },
  { name: "Little Ant", meaning: "You are a hard worker and always reliable in any situation." },
  { name: "Rainbow Cupcake", meaning: "You are sweet and colorful, always bringing happiness and cheer." },
  { name: "Mini Robot", meaning: "You are sophisticated and always ready to help with high-tech intelligence." },
  { name: "Flying Fish", meaning: "You are unique and full of surprises, always surpassing existing limits." },
  { name: "Fried Chicken", meaning: "You are always liked and awaited by many people, full of deliciousness in every step." },
  { name: "Flying Cockroach", meaning: "You always surprise and make a whole room noisy." },
  { name: "Wacky Goat", meaning: "You are unique and always make people laugh with your strange behavior." },
  { name: "Crispy Cracker", meaning: "You always make the atmosphere more exciting and delicious." },
  { name: "Piggy Bank", meaning: "You always hold surprises inside you." },
  { name: "Old Wardrobe", meaning: "You are full of stories and memories of the past." },
  { name: "Milk Coffee", meaning: "You are sweet and always boost the spirits of people around you." },
  { name: "Bamboo Broom", meaning: "You are strong and always reliable for cleaning up problems." },
  { name: "Fried Noodles", meaning: "Always satisfying and makes you happy." },
  { name: "Melting Ice Cream", meaning: "Always melts the atmosphere with its sweet taste." },
  { name: "Persistent Meatball", meaning: "Always persistent and round in facing problems." },
  { name: "Super Glue", meaning: "Always sticky in complicated situations." },
  { name: "Sweet Soy Sauce", meaning: "Always gives a sweet touch in life." },
  { name: "Bath Soap", meaning: "Always clean and fragrant." },
  { name: "Spilled Coffee", meaning: "Always enthusiastic, but sometimes messy." },
  { name: "Alley Cat", meaning: "Always independent and full of adventure." },
  { name: "Bitter Herbal Tonic", meaning: "Always gives strength even if not pleasant at first." },
  { name: "Tea Bag", meaning: "Always gives a warm feeling in the heart." },
  { name: "Loyal Old Motorbike", meaning: "Always loyal and tough." },
  { name: "Instant Noodles", meaning: "Always fast and filling." },
  { name: "Steamed Sponge Cake", meaning: "Always soft and sweet." },
  { name: "Round Tofu", meaning: "Always delicious in any situation." },
  { name: "Coconut Rice", meaning: "Always suitable at any time." },
  { name: "Crowned Lion", meaning: "You were born a leader, possessing the strength and wisdom of a king." },
  { name: "Black Panther", meaning: "You are mysterious and strong, like a tiger that is rarely seen but always alert." },
  { name: "Golden Horse", meaning: "You are valuable and strong, ready to run towards success." },
  { name: "Blue Eagle", meaning: "You have sharp vision and can see opportunities from afar." },
  { name: "Rainbow Dragon", meaning: "You are tough and have the power to protect and attack." },
  { name: "White Elephant", meaning: "You are wise and have great strength, a symbol of courage and fortitude." },
  { name: "Sacred Bull", meaning: "You are strong and full of spirit, not afraid to face obstacles." },
  { name: "Electric Fan", meaning: "Always provides fresh air." },
  { name: "Rice Cooker", meaning: "Always cooks rice perfectly." },
  { name: "Speedy Scooter", meaning: "Always agile on the road." },
  { name: "Flip Flop", meaning: "Always relaxed and comfortable." },
  { name: "Body Pillow", meaning: "Always comfortable in an embrace." },
  { name: "Tracking Dog", meaning: "You are loyal and dedicated, always finding the way to your goal." },
];

function getRandomKhodam() {
  return KHODAMS[Math.floor(Math.random() * KHODAMS.length)];
}

const pluginConfig = {
  name: "cekkhodam",
  alias: ["khodam", "cekhodam"],
  category: "fun",
  description: "Check your inner guardian spirit (khodam)",
  usage: ".cekkhodam [or reply to someone]",
  example: ".cekkhodam",
  isOwner: false,
  isPremium: false,
  isGroup: false,
  isPrivate: false,
  cooldown: 10,
  isEnabled: true,
};

function handler(m, { sock }) {
  let targetJid = m.sender;
  let targetName = m.pushName || m.sender.split("@")[0];

  if (m.quoted) {
    targetJid = m.quoted.sender;
    targetName = m.quoted.pushName || targetJid.split("@")[0];
  } else if (m.mentionedJid?.[0]) {
    targetJid = m.mentionedJid[0];
    targetName = targetJid.split("@")[0];
  }

  const khodam = getRandomKhodam();
  const num = targetJid.split("@")[0];

  const txt =
    `╭─〔 🔮 *KHODAM CHECKER* 〕
` +
    `│
` +
    `│  👤 *Name:* ${targetName}
` +
    `│  📱 *Number:* +${num}
` +
    `│
` +
    `│  ✨ *Khodam:* ${khodam.name}
` +
    `│
` +
    `│  📖 *Meaning:*
` +
    `│  _${khodam.meaning}_
` +
    `│
` +
    `╰───────────────`;

  m.reply(txt);
}

export { pluginConfig as config, handler };
