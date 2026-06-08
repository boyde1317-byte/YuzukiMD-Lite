import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
const PRICES = {
  "🐟 Common Fish": 500, "🐠 Tropical Fish": 1200, "🦈 Shark": 8000,
  "🐡 Pufferfish": 3000, "🦑 Squid": 2500, "🦀 Crab": 800,
  "🐙 Octopus": 4000, "🐋 Whale": 15000, "🦞 Lobster": 3500, "🪸 Coral": 200,
  "🐇 Rabbit": 300, "🦌 Deer": 800, "🐗 Boar": 1500, "🐺 Wolf": 3000,
  "🐻 Bear": 6000, "🦁 Lion": 10000, "🐉 Dragon": 50000,
  "⛏️ Stone": 50, "🪨 Coal": 100, "🟫 Iron": 300, "🟨 Gold": 1000,
  "💎 Diamond": 5000, "🔮 Emerald": 8000, "⭐ Netherite": 20000,
};
const pluginConfig = {
  name: "sellall", alias: ["sell"], category: "rpg",
  description: "Sell all items in your inventory", usage: ".sellall",
  example: ".sellall", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const inv = user.inventory || {};
  let total = 0;
  let sold = [];
  for (const [name, qty] of Object.entries(inv)) {
    const price = PRICES[name] || 100;
    total += price * qty;
    sold.push(`${name} x${qty}`);
  }
  if (sold.length === 0) return m.reply("📦 Your inventory is empty! Nothing to sell.");
  user.koin = (user.koin || 0) + total;
  user.inventory = {};
  db.save();
  m.reply(`╭─〔 💰 *SOLD ALL* 〕\n│\n│  Items sold: *${sold.length} types*\n│  💰 Total: *${formatKoin(total)}*\n│  💵 Balance: *${formatKoin(user.koin)}*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
