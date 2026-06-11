
import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const DONORS = [
  { name: "🤵 Rich Uncle", min: 500, max: 2000 },
  { name: "👵 Grandma", min: 200, max: 1000 },
  { name: "🧙 Wizard", min: 1000, max: 5000 },
  { name: "🐕 Stray Dog", min: 50, max: 200 },
  { name: "🧑‍🎤 Street Musician", min: 300, max: 1500 },
];
const pluginConfig = {
  name: "beg", alias: [], category: "rpg",
  description: "Beg for coins on the street", usage: ".beg",
  example: ".beg", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 180, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const cd = checkCooldown(user, "beg", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ You just begged! Wait ${cd.remaining}s.`);
  const donor = DONORS[Math.floor(Math.random() * DONORS.length)];
  const isWin = Math.random() < 0.6;
  if (isWin) {
    const amount = Math.floor(Math.random() * (donor.max - donor.min)) + donor.min;
    user.koin = (user.koin || 0) + amount;
    await addExpWithLevelCheck(sock, m, db, user, Math.floor(amount / 10));
    db.save();
    m.reply(`╭─〔 🙏 *BEGGING* 〕\n│\n│  ${donor.name} gave you *${formatKoin(amount)}*!\n│  💵 Balance: *${formatKoin(user.koin)}*\n│\n╰───────────────`);
  } else {
    m.reply(`╭─〔 🙏 *BEGGING* 〕\n│\n│  ${donor.name} ignored you... 😢\n│  Try again later!\n│\n╰───────────────`);
  }
}
export { pluginConfig as config, handler };
