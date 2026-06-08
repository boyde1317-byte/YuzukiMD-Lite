/**
 * Carousel — Plugin
 * .carousel <url1> | <url2> | ... [:: caption]
 * Sends a swipeable image carousel card.
 */
import { sendCarousel } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "carousel",
  alias: ["swipe", "imagecarousel", "cards"],
  category: "tools",
  description: "Send a swipeable image carousel (up to 6 images)",
  usage: ".carousel <url1> | <url2> | ... [:: header text]",
  example: ".carousel https://i.imgur.com/a.jpg | https://i.imgur.com/b.jpg :: My Photos",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, isEnabled: true,
};

async function handler(m, { sock }) {
  // Split header from urls with "::"
  const [urlPart, header] = m.text.split("::").map((s) => s.trim());
  const urls = urlPart.split("|").map((u) => u.trim()).filter(Boolean);

  if (!urls.length)
    return m.reply(
      `Usage: .carousel <url1> | <url2> [:: header]\n\nExample:\n.carousel https://... | https://... :: My Gallery`
    );

  if (urls.length > 6)
    return m.reply("❌ Maximum *6 images* per carousel.");

  // Validate URLs
  for (const u of urls) {
    try { new URL(u); } catch {
      return m.reply(`❌ Invalid URL: \`${u}\``);
    }
  }

  await m.react("⏳");

  try {
    await sendCarousel(sock, m.from, {
      headerText: header ?? `🖼️ ${urls.length} images`,
      items: urls.map((url, i) => ({
        imageUrl: url,
        title:    `Image ${i + 1}`,
        body:     header ? `${header} — ${i + 1}/${urls.length}` : `${i + 1} of ${urls.length}`,
      })),
    }, { quoted: m._raw });
    await m.react("✅");
  } catch (e) {
    await m.react("❌");
    m.reply(`❌ Carousel failed: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
