import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
const SHOP_ITEMS = [
  { id: "health_potion", name: "🧪 Health Potion", price: 1000, desc: "Restores 30 HP" },
  { id: "mega_potion", name: "🧪 Mega Potion", price: 3000, desc: "Restores 80 HP" },
  { id: "energy_drink", name: "⚡ Energy Drink", price: 500, desc: "Reduces cooldowns by 50%" },
  { id: "lucky_charm", name: "🍀 Lucky Charm", price: 5000, desc: "Boosts drop rates" },
  { id: "sword", name: "⚔️ Iron Sword", price: 10000, desc: "Increases hunt success rate" },
  { id: "fishing_rod", name: "🎣 Fishing Rod", price: 8000, desc: "Better fishing results" },
  { id: "pickaxe", name: "⛏️ Diamond Pickaxe", price: 15000, desc: "Better mining results" },
  { id: "armor", name: "🛡️ Armor", price: 12000, desc: "Reduces damage taken" },
];
const pluginConfig = {
  name: "shop", alias: ["store", "toko"], category: "rpg",
  description: "Browse and buy RPG items", usage: ".shop [buy <item>]",
  example: ".shop buy health_potion", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const text = m.text.trim().toLowerCase();
  if (!text || text === "list" || text === "") {
    let txt = `╭─〔 🏪 *RPG SHOP* 〕\n│\n`;
    for (const item of SHOP_ITEMS) {
      txt += `│  *${item.id}*\n│  ${item.name} — ${formatKoin(item.price)}\n│  _${item.desc}_\n│\n`;
    }
    txt += `│  💰 Your coins: *${formatKoin(user.koin || 0)}*\n│  Usage: .shop buy <item_id>\n│\n╰───────────────`;
    return m.reply(txt);
  }
  if (text.startsWith("buy ")) {
    const itemId = text.slice(4).trim();
    const item = SHOP_ITEMS.find(i => i.id === itemId);
    if (!item) return m.reply(`❌ Item *${itemId}* not found. Use .shop to see items.`);
    if ((user.koin || 0) < item.price) return m.reply(`💰 Not enough coins! Need *${formatKoin(item.price)}*, you have *${formatKoin(user.koin || 0)}*.`);
    user.koin -= item.price;
    if (!user.inventory) user.inventory = {};
    user.inventory[item.name] = (user.inventory[item.name] || 0) + 1;
    db.save();
    return m.reply(`╭─〔 🏪 *PURCHASE SUCCESS* 〕\n│\n│  🛒 Bought: *${item.name}*\n│  💰 Cost: *${formatKoin(item.price)}*\n│  💵 Remaining: *${formatKoin(user.koin)}*\n│\n╰───────────────`);
  }
  m.reply("Usage: .shop | .shop buy <item_id>");
}
export { pluginConfig as config, handler };
