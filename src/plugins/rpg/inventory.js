import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "inventory", alias: ["inv", "bag"], category: "rpg",
  description: "View your RPG inventory", usage: ".inventory",
  example: ".inventory", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const inv = user.inventory || {};
  const items = Object.entries(inv).filter(([_, v]) => v > 0);
  if (items.length === 0) return m.reply("📦 Your inventory is empty! Go adventure, fish, hunt, or mine to get items.");
  let txt = `╭─〔 🎒 *INVENTORY* 〕\n│\n│  👤 *${m.pushName}*\n│  ❤️ HP: ${user.rpg?.health || 100}/${100 + (user.level || 0) * 5}\n│  💰 Coins: ${formatKoin(user.koin || 0)}\n│  🏦 Bank: ${formatKoin(user.bank || 0)}\n│\n`;
  for (const [name, qty] of items.slice(0, 20)) {
    txt += `│  • ${name} x${qty}\n`;
  }
  txt += `│\n╰───────────────`;
  m.reply(txt);
}
export { pluginConfig as config, handler };
