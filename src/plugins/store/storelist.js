/**
 * Enhanced Store List — uses NativeFlowCard interactive message
 * Replaces the plain-text storelist plugin.
 */
import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
import { NativeFlowCard } from "../../lib/yuzuki-builder.js";

const pluginConfig = {
  name: "storelist",
  alias: ["liststore", "products"],
  category: "store",
  description: "Browse store products (interactive card)",
  usage: ".storelist",
  example: ".storelist",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const db    = getDatabase();
  const items = (db.settings.store || []).filter((i) => i.stock > 0);

  if (!items.length) return m.reply("📦 Store is empty! Ask the owner to add products.");

  // Build a single card per page (max 10 items shown in select list)
  const rows = items.slice(0, 10).map((item) => ({
    id:          item.id,
    title:       `${item.name}  —  ${formatKoin(item.price)}`,
    description: `Stock: ${item.stock}  |  ${item.desc}`,
  }));

  const card = new NativeFlowCard(sock)
    .setTitle("🏪 Yuzuki Store")
    .setBody(`${items.length} product(s) available\nSelect one below to see details.`)
    .setFooter("Use .buy <id> to purchase")
    .addSelect("📦 View Products", "Available Products", rows);

  // Add CTA for each item if ≤ 3
  if (items.length <= 3) {
    const plainCard = new NativeFlowCard(sock)
      .setTitle("🏪 Yuzuki Store")
      .setBody(
        items.map((i) =>
          `• *${i.name}*  —  ${formatKoin(i.price)}\n  _${i.desc}_  (Stock: ${i.stock})`
        ).join("\n\n")
      )
      .setFooter("Use .buy <id> to purchase");
    for (const i of items) {
      plainCard.addCtaCopy(`🛒 Copy ID: ${i.name}`, i.id);
    }
    return plainCard.send(m.from);
  }

  return card.send(m.from);
}

export { pluginConfig as config, handler };
