
import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "buy", alias: ["purchase"], category: "store",
  description: "Buy a product from store", usage: ".buy <product_id>",
  example: ".buy 12345", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const id = m.text.trim();
  const items = db.settings.store || [];
  const item = items.find(i => i.id === id);
  if (!item) return m.reply(`❌ Product *${id}* not found. Use .storelist to see products.`);
  if (item.stock <= 0) return m.reply("❌ Out of stock!");
  if ((user.koin || 0) < item.price) return m.reply(`💰 Not enough coins! Need ${formatKoin(item.price)}`);
  user.koin -= item.price;
  item.stock -= 1;
  db.save();
  m.reply(`╭─〔 🛒 *PURCHASE SUCCESS* 〕\n│\n│  📦 ${item.name}\n│  💰 ${formatKoin(item.price)}\n│  💵 Remaining: ${formatKoin(user.koin)}\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
