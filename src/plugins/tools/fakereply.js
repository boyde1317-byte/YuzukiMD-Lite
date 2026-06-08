/**
 * Fake Reply / Fake Quote — Plugin
 * .fakereply <quoted text> | <reply text>
 * Makes it appear the bot is replying to a custom message bubble.
 */
import { sendWithFakeQuote } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "fakereply",
  alias: ["fq", "fakequote", "quotetrick"],
  category: "tools",
  description: "Send a message that appears to reply to any custom text",
  usage: ".fakereply <quoted text> | <reply text>  [| <sender name>]",
  example: ".fakereply Hello how are you? | I'm doing great thanks! | John",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const parts = m.text.split("|").map((s) => s.trim());
  const quotedText = parts[0];
  const replyText  = parts[1];
  const senderName = parts[2] ?? "User";

  if (!quotedText || !replyText)
    return m.reply(
      `Usage: .fakereply <quoted> | <reply> [| <sender name>]\n\nExample:\n.fakereply *Did you eat?* | Not yet 😅 | Mom`
    );

  await sendWithFakeQuote(sock, m.from, replyText, {
    quotedName: senderName,
    quotedText,
    useContact: false,
  });
}

export { pluginConfig as config, handler };
