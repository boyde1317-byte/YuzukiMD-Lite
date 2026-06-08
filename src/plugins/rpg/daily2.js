
import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "daily2", alias: ["claim"], category: "rpg",
  description: "Claim daily rewards", usage: ".daily2",
  example: ".daily2", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 86400, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const cd = checkCooldown(user, "daily2", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ Daily reward already claimed! Come back in ${Math.floor(cd.remaining / 3600)}h ${Math.floor((cd.remaining % 3600) / 60)}m.`);
  const coins = Math.floor(Math.random() * 5000) + 2000;
  const exp = Math.floor(Math.random() * 500) + 100;
  user.koin = (user.koin || 0) + coins;
  await addExpWithLevelCheck(sock, m, db, user, exp);
  db.save();
  m.reply(`╭─〔 🎁 *DAILY REWARD* 〕\n│\n│  💰 Coins: *+${formatKoin(coins)}*\n│  📈 EXP: *+${exp}*\n│  💵 Balance: *${formatKoin(user.koin)}*\n│\n│  Come back tomorrow! 🌅\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
