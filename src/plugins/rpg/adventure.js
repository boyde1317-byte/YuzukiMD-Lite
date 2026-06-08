import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const pluginConfig = {
  name: "adventure", alias: ["adv", "petualangan"], category: "rpg",
  description: "Go on an adventure to gain EXP and rewards", usage: ".adventure",
  example: ".adventure", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 120, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  if (!user.rpg) user.rpg = {};
  user.rpg.health = user.rpg.health || 100;
  if (user.rpg.health < 30) return m.reply(`⚠️ Your HP is too low! (${user.rpg.health}/100). Heal first with .heal`);
  const cd = checkCooldown(user, "adventure", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ Adventure cooldown: ${cd.remaining}s remaining`);
  const locations = ["🌲 Dark Forest", "🏔️ Eternal Ice Mountain", "🏜️ Death Desert", "🌋 Volcano", "🏰 Haunted Castle", "🌊 Mysterious Beach"];
  const location = locations[Math.floor(Math.random() * locations.length)];
  await m.react("🗺️");
  await m.reply(`🎒 Packing your bag and lighting the torch... Entering *${location}*... ⚔️`);
  await new Promise(r => setTimeout(r, 2000));
  const isWin = Math.random() < 0.6;
  if (isWin) {
    const expGain = Math.floor(Math.random() * 2000) + 500;
    const moneyGain = Math.floor(Math.random() * 10000) + 2000;
    user.koin = (user.koin || 0) + moneyGain;
    await addExpWithLevelCheck(sock, m, db, user, expGain);
    db.save();
    m.reply(`╭─〔 ⚔️ *ADVENTURE SUCCESS* 〕\n│\n│  📍 Location: *${location}*\n│\n│  💰 Coins: *+${formatKoin(moneyGain)}*\n│  📈 EXP: *+${expGain}*\n│\n│  You returned safely! 🚀\n│\n╰───────────────`);
  } else {
    const healthLoss = Math.floor(Math.random() * 30) + 10;
    user.rpg.health = Math.max(0, user.rpg.health - healthLoss);
    let msg = `╭─〔 ☠️ *AMBUSHED!* 〕\n│\n│  📍 Location: *${location}*\n│\n│  ❤️ HP Lost: *-${healthLoss}* (Remaining: ${user.rpg.health})\n│`;
    if (user.rpg.health <= 0) {
      user.rpg.health = 0; user.exp = Math.floor((user.exp || 0) / 2);
      msg += `│  💀 *YOU DIED!* EXP penalized 50%.\n│`;
    } else {
      msg += `│  You managed to escape! 🏃\n│`;
    }
    db.save();
    m.reply(msg + `\n╰───────────────`);
  }
}
export { pluginConfig as config, handler };
