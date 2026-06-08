import { getDatabase } from "../../lib/legacy-compat.js";

const KHODAMS = [
  { name: "Harimau Putih", meaning: "You are strong and brave like a tiger — your ancestors passed great power to you." },
  { name: "Lampu Tertidur", meaning: "Looks sleepy but always gives warm light." },
  { name: "Panda Ompong", meaning: "You are adorable and always make people smile with your quirks." },
  { name: "Bebek Karet", meaning: "You are always calm and cheerful, able to face waves of problems with a smile." },
  { name: "Ninja Turtle", meaning: "You are agile and tough, ready to protect the weak with your combat strength." },
  { name: "Kucing Kulkas", meaning: "You are mysterious and always in unexpected places." },
  { name: "Sabun Wangi", meaning: "You always bring fragrance and freshness wherever you go." },
  { name: "Semut Kecil", meaning: "You are a hard worker and always reliable in any situation." },
  { name: "Cupcake Pelangi", meaning: "You are sweet and colorful, always bringing happiness and cheer." },
  { name: "Robot Mini", meaning: "You are sophisticated and always ready to help with high-tech intelligence." },
  { name: "Ikan Terbang", meaning: "You are unique and full of surprises, always surpassing existing limits." },
  { name: "Ayam Goreng", meaning: "You are always liked and awaited by many people, full of deliciousness in every step." },
  { name: "Kecoa Terbang", meaning: "You always surprise and make a whole room noisy." },
  { name: "Kambing Ngebor", meaning: "You are unique and always make people laugh with your strange behavior." },
  { name: "Kerupuk Renyah", meaning: "You always make the atmosphere more exciting and delicious." },
  { name: "Celengan Babi", meaning: "You always hold surprises inside you." },
  { name: "Lemari Tua", meaning: "You are full of stories and memories of the past." },
  { name: "Kopi Susu", meaning: "You are sweet and always boost the spirits of people around you." },
  { name: "Sapu Lidi", meaning: "You are strong and always reliable for cleaning up problems." },
  { name: "Indomie Goreng", meaning: "Always satisfying and makes you happy." },
  { name: "Es Krim Meleleh", meaning: "Always melts the atmosphere with its sweet taste." },
  { name: "Bakso Ulet", meaning: "Always persistent and round in facing problems." },
  { name: "Lem Super", meaning: "Always sticky in complicated situations." },
  { name: "Kecap Manis", meaning: "Always gives a sweet touch in life." },
  { name: "Sabun Mandi", meaning: "Always clean and fragrant." },
  { name: "Kopi Tumpah", meaning: "Always enthusiastic, but sometimes messy." },
  { name: "Kucing Kampung", meaning: "Always independent and full of adventure." },
  { name: "Jamu Pahit", meaning: "Always gives strength even if not pleasant at first." },
  { name: "Teh Celup", meaning: "Always gives a warm feeling in the heart." },
  { name: "Motor Astrea", meaning: "Always loyal and tough." },
  { name: "Mie Instan", meaning: "Always fast and filling." },
  { name: "Bolu Kukus", meaning: "Always soft and sweet." },
  { name: "Tahu Bulat", meaning: "Always delicious in any situation." },
  { name: "Nasi Uduk", meaning: "Always suitable at any time." },
  { name: "Singa Bermahkota", meaning: "You were born a leader, possessing the strength and wisdom of a king." },
  { name: "Macan Kumbang", meaning: "You are mysterious and strong, like a tiger that is rarely seen but always alert." },
  { name: "Kuda Emas", meaning: "You are valuable and strong, ready to run towards success." },
  { name: "Elang Biru", meaning: "You have sharp vision and can see opportunities from afar." },
  { name: "Naga Pelangi", meaning: "You are tough and have the power to protect and attack." },
  { name: "Gajah Putih", meaning: "You are wise and have great strength, a symbol of courage and fortitude." },
  { name: "Banteng Sakti", meaning: "You are strong and full of spirit, not afraid to face obstacles." },
  { name: "Kipas Angin", meaning: "Always provides fresh air." },
  { name: "Rice Cooker", meaning: "Always cooks rice perfectly." },
  { name: "Honda Beat", meaning: "Always agile on the road." },
  { name: "Sandal Jepit", meaning: "Always relaxed and comfortable." },
  { name: "Bantal Guling", meaning: "Always comfortable in an embrace." },
  { name: "Anjing Pelacak", meaning: "You are loyal and dedicated, always finding the way to your goal." },
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
