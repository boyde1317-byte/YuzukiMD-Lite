
import { getDatabase } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "addlist", alias: ["addproduct"], category: "store",
  description: "Add a product to store", usage: ".addlist <name>|<price>|<desc>",
  example: ".addlist Netflix|15000|1 month shared", isOwner: true, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 3, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const parts = m.text.trim().split("|");
  if (parts.length < 3) return m.reply("Usage: .addlist <name>|<price>|<description>");
  const [name, price, desc] = parts;
  if (!db.settings.store) db.settings.store = [];
  db.settings.store.push({ id: Date.now().toString(), name: name.trim(), price: parseInt(price) || 0, desc: desc.trim(), stock: 1 });
  db.save();
  m.reply(`✅ *Product added!*\n\n📦 ${name.trim()}\n💰 Rp ${price.trim()}\n📝 ${desc.trim()}`);
}
export { pluginConfig as config, handler };
