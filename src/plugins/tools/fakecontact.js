/**
 * Fake Contact Card — Plugin
 * .fakecontact <name> | <number>
 * Sends a vCard contact bubble with any name/number you choose.
 */
import { sendFakeContact } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "fakecontact",
  alias: ["vcard", "fakevc", "contactcard"],
  category: "tools",
  description: "Send a fake contact card (vCard bubble) with custom name & number",
  usage: ".fakecontact <name> | <number>  [| <org>]",
  example: ".fakecontact Elon Musk | 14085551234 | Tesla",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const parts = m.text.split("|").map((s) => s.trim());
  const name   = parts[0];
  const number = parts[1];
  const org    = parts[2] ?? "";

  if (!name || !number)
    return m.reply(
      `Usage: .fakecontact <name> | <number> [| <org>]\n\nExample:\n.fakecontact *Elon Musk* | 14085551234 | Tesla`
    );

  const cleanNum = number.replace(/[^0-9]/g, "");
  if (cleanNum.length < 5)
    return m.reply("❌ Invalid number. Use international format e.g. *14085551234*");

  await sendFakeContact(sock, m.from, {
    displayName: name,
    number: cleanNum,
    org,
    verified: name.startsWith("✅"),
  }, { quoted: m._raw });
}

export { pluginConfig as config, handler };
