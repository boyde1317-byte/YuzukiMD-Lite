import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const PREY = [
  { name: "🐇 Rabbit", price: 300, exp: 50 },
  { name: "🦌 Deer", price: 800, exp: 120 },
  { name: "🐗 Boar", price: 1500, exp: 250 },
  { name: "🐺 Wolf", price: 3000, exp: 500 },
  { name: "🐻 Bear", price: 6000, exp: 1000 },
  { name: "🦁 Lion", price: 10000, exp: 2000 },
  { name: "🐉 Dragon", price: 50000, exp: 10000 },
];
const pluginConfig = {
  name: "hunt", alias: [], category: "rpg",
  description: "Go hunting for wild animals", usage: ".hunt",
  example: ".hunt", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 120, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.rpg) user.rpg = {};
  user.rpg.health = user.rpg.health || 100;
  if (user.rpg.health < 20) return m.reply(`⚠️ HP too low (${user.rpg.health}/100). Heal first!`);
  const cd = checkCooldown(user, "hunt", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ Hunt cooldown: ${cd.remaining}s remaining`);
  await m.react("🏹");
  const prey = PREY[Math.floor(Math.random() * PREY.length)];
  const isWin = Math.random() < 0.7;
  if (isWin) {
    user.koin = (user.koin || 0) + prey.price;
    if (!user.inventory) user.inventory = {};
    user.inventory[prey.name] = (user.inventory[prey.name] || 0) + 1;
    await addExpWithLevelCheck(sock, m, db, user, prey.exp);
    db.save();
    m.reply(`╭─〔 🏹 *HUNT SUCCESS* 〕\n│\n│  Target: *${prey.name}*\n│  💰 Reward: *${formatKoin(prey.price)}*\n│  📈 EXP: *+${prey.exp}*\n│\n╰───────────────`);
  } else {
    const dmg = Math.floor(Math.random() * 20) + 5;
    user.rpg.health = Math.max(0, user.rpg.health - dmg);
    db.save();
    m.reply(`╭─〔 🏹 *HUNT FAILED* 〕\n│\n│  The *${prey.name}* escaped!\n│  ❤️ HP Lost: *-${dmg}* (Remaining: ${user.rpg.health})\n│\n╰───────────────`);
  }
}
export { pluginConfig as config, handler };
