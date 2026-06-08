import { getDatabase, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const PETS = [
  { name: "🐕 Dog", bonus: "hunt", value: 1.2 },
  { name: "🐈 Cat", bonus: "adventure", value: 1.15 },
  { name: "🦜 Parrot", bonus: "exp", value: 1.3 },
  { name: "🐉 Dragon", bonus: "all", value: 1.5 },
  { name: "🦄 Unicorn", bonus: "coins", value: 1.4 },
  { name: "🦊 Fox", bonus: "mine", value: 1.25 },
];
const pluginConfig = {
  name: "pet", alias: ["mypet"], category: "rpg",
  description: "View or adopt a pet", usage: ".pet [adopt]",
  example: ".pet adopt", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 300, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const text = m.text.trim().toLowerCase();
  if (!user.rpg) user.rpg = {};
  if (text === "adopt") {
    if (user.rpg.pet) return m.reply(`You already have a pet: *${user.rpg.pet.name}*`);
    const cost = 25000;
    if ((user.koin || 0) < cost) return m.reply(`💰 Need *${formatKoin(cost)}* to adopt a pet!`);
    const pet = PETS[Math.floor(Math.random() * PETS.length)];
    user.koin -= cost;
    user.rpg.pet = { ...pet, level: 1, exp: 0 };
    db.save();
    return m.reply(`╭─〔 🐾 *PET ADOPTED* 〕\n│\n│  🐾 *${pet.name}* joined you!\n│  ✨ Bonus: *${pet.bonus}* (+${Math.round((pet.value-1)*100)}%)\n│\n╰───────────────`);
  }
  if (!user.rpg.pet) return m.reply(`You don't have a pet yet! Use *.pet adopt* to get one (costs ${formatKoin(25000)}).`);
  const p = user.rpg.pet;
  m.reply(`╭─〔 🐾 *YOUR PET* 〕\n│\n│  🐾 Name: *${p.name}*\n│  ⭐ Level: *${p.level}*\n│  ✨ Bonus: *${p.bonus}* (+${Math.round((p.value-1)*100)}%)\n│  📈 EXP: *${p.exp}*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
