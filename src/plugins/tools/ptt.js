/**
 * Voice Note Sender — Plugin
 * .ptt <url>  — sends any audio URL as a push-to-talk voice bubble
 */
import { sendVoiceNote } from "../../lib/msg-types.js";

const pluginConfig = {
  name: "ptt",
  alias: ["voicenote", "voicemsg", "audio2ptt"],
  category: "tools",
  description: "Send an audio URL as a voice note (PTT) bubble",
  usage: ".ptt <audio URL>",
  example: ".ptt https://example.com/audio.ogg",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};

async function handler(m, { sock }) {
  // Also support replying to an audio message
  const url = m.text.trim();
  const quotedAudio = m.quoted?.message?.audioMessage ? m.quoted : null;

  if (!url && !quotedAudio)
    return m.reply("Usage: .ptt <audio URL>  or reply to an audio message");

  await m.react("🎙️");

  try {
    if (quotedAudio) {
      // Re-send quoted audio as PTT
      const { default: axios } = await import("axios");
      // We send the quoted message's media URL as PTT
      const audioUrl = quotedAudio.message.audioMessage.url;
      await sendVoiceNote(sock, m.from, audioUrl, { quoted: m._raw });
    } else {
      try { new URL(url); } catch { return m.reply("❌ Invalid URL."); }
      await sendVoiceNote(sock, m.from, url, { quoted: m._raw });
    }
    await m.react("✅");
  } catch (e) {
    await m.react("❌");
    m.reply(`❌ Failed: ${e.message}`);
  }
}

export { pluginConfig as config, handler };
