import { getDatabase, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "heal", alias: ["healing"], category: "rpg",
  description: "Heal your HP using coins", usage: ".heal",
  example: ".heal", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, isEnabled: true,
};
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.rpg) user.rpg = {};
  user.rpg.health = user.rpg.health || 100;
  const maxHP = 100 + (user.level || 0) * 5;
  if (user.rpg.health >= maxHP) return m.reply(`❤️ Your HP is already full! (${user.rpg.health}/${maxHP})`);
  const cost = Math.floor((maxHP - user.rpg.health) * 2);
  if ((user.koin || 0) < cost) return m.reply(`💰 Not enough coins! Need *${formatKoin(cost)}*`);
  user.koin -= cost;
  const healAmount = maxHP - user.rpg.health;
  user.rpg.health = maxHP;
  db.save();
  m.reply(`╭─〔 💉 *HEAL SUCCESS* 〕\n│\n│  ❤️ HP: *+${healAmount}* → ${maxHP}/${maxHP}\n│  💰 Cost: *${formatKoin(cost)}*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
