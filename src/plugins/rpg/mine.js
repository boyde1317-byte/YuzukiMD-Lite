import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const ORES = [
  { name: "⛏️ Stone", price: 50, exp: 10 },
  { name: "🪨 Coal", price: 100, exp: 20 },
  { name: "🟫 Iron", price: 300, exp: 50 },
  { name: "🟨 Gold", price: 1000, exp: 150 },
  { name: "💎 Diamond", price: 5000, exp: 500 },
  { name: "🔮 Emerald", price: 8000, exp: 800 },
  { name: "⭐ Netherite", price: 20000, exp: 2000 },
];
const pluginConfig = {
  name: "mine", alias: ["mining"], category: "rpg",
  description: "Mine for ores and gems", usage: ".mine",
  example: ".mine", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 60, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const cd = checkCooldown(user, "mine", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ Mining cooldown: ${cd.remaining}s remaining`);
  await m.react("⛏️");
  const ore = ORES[Math.floor(Math.random() * ORES.length)];
  const amount = Math.floor(Math.random() * 5) + 1;
  const total = ore.price * amount;
  if (!user.inventory) user.inventory = {};
  user.inventory[ore.name] = (user.inventory[ore.name] || 0) + amount;
  user.koin = (user.koin || 0) + total;
  await addExpWithLevelCheck(sock, m, db, user, ore.exp * amount);
  db.save();
  m.reply(`╭─〔 ⛏️ *MINING RESULT* 〕\n│\n│  Found: *${ore.name}* x${amount}\n│  💰 Value: *${formatKoin(total)}*\n│  📈 EXP: *+${ore.exp * amount}*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
