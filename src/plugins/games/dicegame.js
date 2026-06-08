
const pluginConfig = {
  name: "dicegame", alias: ["diceroll"], category: "games",
  description: "Roll dice and win coins", usage: ".dicegame <bet>",
  example: ".dicegame 1000", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};
import { getDatabase, formatKoin } from "../../lib/legacy-compat.js";
function handler(m) {
  const db = getDatabase();
  const user = db.getUser(m.sender);
  const bet = parseInt(m.text.trim());
  if (isNaN(bet) || bet <= 0) return m.reply("Usage: .dicegame <bet_amount>\nExample: .dicegame 1000");
  if ((user.koin || 0) < bet) return m.reply(`💰 Not enough coins! You have ${formatKoin(user.koin || 0)}`);
  const player = Math.floor(Math.random() * 6) + 1;
  const bot = Math.floor(Math.random() * 6) + 1;
  let result = "";
  if (player > bot) { user.koin += bet; result = `🎉 You win! +${formatKoin(bet)}`; }
  else if (player < bot) { user.koin -= bet; result = `😢 You lose! -${formatKoin(bet)}`; }
  else { result = "🤝 Draw! No change."; }
  db.save();
  m.reply(`╭─〔 🎲 *DICE GAME* 〕\n│\n│  You: *${player}* | Bot: *${bot}*\n│  ${result}\n│  💰 Balance: ${formatKoin(user.koin)}\n│\n╰───────────────`);
}
export { pluginConfig as config, handler };
