/**
 * OTP Verification Card — Plugin
 * Generates a styled OTP display card.
 * Usage: .otp  or  .otp <length>
 */

import { generateOTPCard } from "../../lib/otp-card.js";

const pluginConfig = {
  name: "otp",
  alias: ["genotp", "makeotp"],
  category: "tools",
  description: "Generate a styled OTP verification card",
  usage: ".otp [length]  (default 6)",
  example: ".otp 6",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};

async function handler(m) {
  const len = Math.min(Math.max(parseInt(m.text.trim()) || 6, 4), 8);
  await m.react("🔐");

  try {
    const { code, buf } = await generateOTPCard(len, {
      title: "Verification Code",
      label: m.pushName || "User",
    });

    await m.sendMessage(m.from, {
      image: buf,
      caption:
        `╭─〔 🔐 *OTP CARD* 〕\n` +
        `│\n` +
        `│  👤 *${m.pushName || "User"}*\n` +
        `│  🔢 *Code:* \`${code}\`\n` +
        `│  ⏱️ *Valid for:* 5 minutes\n` +
        `│  ⚠️ _Never share this code_\n` +
        `│\n` +
        `╰───────────────`,
    });
  } catch {
    m.reply("❌ Failed to generate OTP card.");
  }
}

export { pluginConfig as config, handler };
