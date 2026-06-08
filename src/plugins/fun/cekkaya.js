
import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "cekkaya",
  alias: ["kaya", "rich"],
  category: "fun",
  description: "Check your wealth (based on RPG coins)",
  usage: ".cekkaya",
  example: ".cekkaya",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false, cooldown: 5, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const total = (user.koin || 0) + (user.bank || 0);
  const label = total >= 1000000 ? "💎 Billionaire" : total >= 500000 ? "🏆 Millionaire" : total >= 100000 ? "💰 Wealthy" : total >= 50000 ? "💵 Comfortable" : total >= 10000 ? "🪙 Saver" : "🥲 Broke";
  m.reply(`╭─〔 💰 *WEALTH CHECK* 〕\n│\n│  👤 *Name:* ${m.pushName}\n│  💵 *Coins:* ${formatKoin(user.koin || 0)}\n│  🏦 *Bank:* ${formatKoin(user.bank || 0)}\n│  💎 *Total:* ${formatKoin(total)}\n│  🏷️ *Status:* ${label}\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
