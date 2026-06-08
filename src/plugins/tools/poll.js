/**
 * Poll Creator — Plugin
 * .poll <question> | opt1 | opt2 | opt3 ...
 */
import { sendPoll } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "poll",
  alias: ["createpoll", "makepoll", "vote"],
  category: "tools",
  description: "Create a WhatsApp poll with up to 12 options",
  usage: ".poll <question> | <option1> | <option2> [| ...]",
  example: ".poll Favorite color? | Red | Blue | Green | Yellow",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  const parts = m.text.split("|").map((s) => s.trim());
  const question = parts[0];
  const options  = parts.slice(1).filter(Boolean);

  if (!question) return m.reply(`Usage: .poll <question> | opt1 | opt2 ...\n\nExample:\n.poll *Best bot?* | Yuzuki | Other`);
  if (options.length < 2) return m.reply("❌ A poll needs at least *2 options*. Separate them with `|`");
  if (options.length > 12) return m.reply("❌ Maximum *12 options* per poll.");

  try {
    await sendPoll(sock, m.from, { question, options }, { quoted: m._raw });
    await m.react("✅");
  } catch (e) {
    await m.react("❌");
    m.reply(`❌ Poll failed: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
