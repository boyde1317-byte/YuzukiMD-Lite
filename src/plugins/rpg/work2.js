
import { getDatabase, addExpWithLevelCheck, checkCooldown, formatKoin } from "../../lib/legacy-compat.js";
const JOBS = [
  { name: "💻 Programmer", min: 2000, max: 8000 },
  { name: "🍔 Chef", min: 1500, max: 5000 },
  { name: "🚚 Driver", min: 1000, max: 4000 },
  { name: "🎨 Designer", min: 2500, max: 7000 },
  { name: "🏗️ Construction Worker", min: 2000, max: 6000 },
  { name: "📚 Teacher", min: 1500, max: 4500 },
  { name: "🎵 Musician", min: 1000, max: 10000 },
  { name: "🧑‍🌾 Farmer", min: 1000, max: 3500 },
];
const pluginConfig = {
  name: "work2", alias: ["kerja"], category: "rpg",
  description: "Work to earn coins", usage: ".work2",
  example: ".work2", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 300, isEnabled: true,
};
async function handler(m, { sock }) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const cd = checkCooldown(user, "work2", pluginConfig.cooldown);
  if (!cd.ok) return m.reply(`⏳ You're tired! Rest for ${cd.remaining}s.`);
  const job = JOBS[Math.floor(Math.random() * JOBS.length)];
  const amount = Math.floor(Math.random() * (job.max - job.min)) + job.min;
  user.koin = (user.koin || 0) + amount;
  await addExpWithLevelCheck(sock, m, db, user, Math.floor(amount / 50));
  db.save();
  m.reply(`╭─〔 💼 *WORK* 〕\n│\n│  Job: *${job.name}*\n│  💰 Salary: *+${formatKoin(amount)}*\n│  💵 Balance: *${formatKoin(user.koin)}*\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
