/**
 * Ephemeral / Disappearing Message — Plugin
 * .disappear <message>  — sends a 7-day auto-delete message
 */
import { sendEphemeral } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "disappear",
  alias: ["ephemeral", "tempMsg", "selfDestruct"],
  category: "tools",
  description: "Send a disappearing message (auto-deletes after set time)",
  usage: ".disappear <message> [| 24h|7d|90d]",
  example: ".disappear This message vanishes in 7 days | 7d",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

const VALID_DURATIONS = ["24h", "7d", "90d"];

async function handler(m, { sock }) {
  const parts    = m.text.split("|").map((s) => s.trim());
  const text     = parts[0];
  const duration = VALID_DURATIONS.includes(parts[1]) ? parts[1] : "7d";

  if (!text) return m.reply(
    `Usage: .disappear <message> [| 24h|7d|90d]\n\nDurations:\n• 24h — 1 day\n• 7d  — 1 week (default)\n• 90d — 90 days`
  );

  try {
    await sendEphemeral(sock, m.from, text, { duration, quoted: m._raw });
    await m.react("💨");
  } catch (e) {
    m.reply(`❌ Failed: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
