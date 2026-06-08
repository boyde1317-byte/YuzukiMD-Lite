/**
 * Fake Location — Plugin
 * .fakeloc <city>   or   .fakeloc <lat>,<lng>  [| name]
 */
import { sendLocation, FAKE_LOCATIONS } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "fakeloc",
  alias: ["sendloc", "location", "fakeplace"],
  category: "tools",
  description: "Send a spoofed location pin — choose a preset city or custom coords",
  usage: ".fakeloc <city>  |  .fakeloc <lat>,<lng> [| name]",
  example: ".fakeloc tokyo  /  .fakeloc -6.2,106.8 | Jakarta",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 5, isEnabled: true,
};

async function handler(m, { sock }) {
  const text = m.text.trim().toLowerCase();

  if (!text) {
    const cities = Object.keys(FAKE_LOCATIONS).join(", ");
    return m.reply(
      `📍 *Fake Location*\n\n` +
      `Usage:\n• \`.fakeloc <city>\` — preset city\n• \`.fakeloc <lat>,<lng>\` — custom coords\n\n` +
      `*Preset cities:*\n${cities}`
    );
  }

  let loc;

  // Preset city?
  const key = text.split("|")[0].trim();
  if (FAKE_LOCATIONS[key]) {
    loc = FAKE_LOCATIONS[key];
  } else if (key.includes(",")) {
    // Custom coords: "lat,lng | name"
    const [latStr, lngStr] = key.split(",");
    const parts = m.text.split("|");
    const name  = parts[1]?.trim() ?? "Custom Location";
    const lat   = parseFloat(latStr);
    const lng   = parseFloat(lngStr);
    if (isNaN(lat) || isNaN(lng)) return m.reply("❌ Invalid coordinates. Use format: `lat,lng`");
    loc = { lat, lng, name };
  } else {
    return m.reply(
      `❌ Unknown city *${key}*.\n\n` +
      `Available: ${Object.keys(FAKE_LOCATIONS).join(", ")}\n` +
      `Or use coords: \`.fakeloc -6.2,106.8 | Jakarta\``
    );
  }

  try {
    await sendLocation(sock, m.from, loc, { quoted: m._raw });
    await m.react("📍");
  } catch (e) {
    m.reply(`❌ Location send failed: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
