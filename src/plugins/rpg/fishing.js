import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const FISH = [
  { name: "🐟 Common Fish", price: 500, weight: 40 },
  { name: "🐠 Tropical Fish", price: 1200, weight: 25 },
  { name: "🦈 Shark", price: 8000, weight: 8 },
  { name: "🐡 Pufferfish", price: 3000, weight: 15 },
  { name: "🦑 Squid", price: 2500, weight: 10 },
  { name: "🦀 Crab", price: 800, weight: 20 },
  { name: "🐙 Octopus", price: 4000, weight: 7 },
  { name: "🐋 Whale", price: 15000, weight: 2 },
  { name: "🦞 Lobster", price: 3500, weight: 5 },
  { name: "🪸 Coral", price: 200, weight: 60 },
];
const pluginConfig = {
  name: "fishing", alias: ["fish"], category: "rpg",
  description: "Go fishing and catch sea creatures", usage: ".fishing",
  example: ".fishing", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 90, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const cd = checkCooldown(user, "fishing", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ Fishing cooldown: ${cd.remaining}s remaining`);
  await m.react("🎣");
  const roll = Math.random() * 100;
  let caught = null;
  let accum = 0;
  for (const f of FISH) {
    accum += f.weight;
    if (roll <= accum) { caught = f; break; }
  }
  if (!caught) caught = FISH[0];
  const size = (Math.random() * 5 + 0.5).toFixed(1);
  if (!user.inventory) user.inventory = {};
  user.inventory[caught.name] = (user.inventory[caught.name] || 0) + 1;
  user.koin = (user.koin || 0) + caught.price;
  await addExpWithLevelCheck(sock, m, db, user, Math.floor(caught.price / 10));
  db.save();
  m.reply(`╭─〔 🎣 *FISHING RESULT* 〕\n│\n│  Caught: *${caught.name}*\n│  📏 Size: *${size} kg*\n│  💰 Sold for: *${formatKoin(caught.price)}*\n│  📦 Added to inventory\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
