/**
 * Yuzuki MD — Message Type Stylers & Tricks
 *
 * Ported & enhanced from Yuzuki MD's yuzuki-message.js + yuzuki-context.js.
 * Covers every WhatsApp message type used for UI/UX styling:
 *
 *  • Fake contact cards (vCard)          → sendContact / sendFakeContact / sendMultiContact
 *  • Fake quoted / fake reply trick      → createFakeQuoted / sendWithFakeQuote
 *  • Typing indicator                    → sendWithTyping / sendPresence
 *  • Location messages                   → sendLocation / sendFakeLocation
 *  • Poll creation                       → sendPoll
 *  • Reaction (emoji react)              → sendReaction
 *  • Disappearing messages               → sendEphemeral
 *  • Link preview override               → sendWithPreview
 *  • Carousel message                    → sendCarousel (images)
 *  • keepInChat trick                    → sendKeepInChat
 *  • Audio/PTT voice note style          → sendVoiceNote
 *  • GIF-style video                     → sendGif
 */

// ─── Contact Cards ────────────────────────────────────────────────────────────

/**
 * Send a real contact card (vCard) — appears as WA contact bubble.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ name: string, number: string, org?: string, email?: string }} contact
 * @param {{ quoted? }} opts
 */
export async function sendContact(sock, jid, contact, opts = {}) {
  const num = contact.number.replace(/[^0-9]/g, "");
  let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${contact.name}\n`;
  if (contact.org)   vcard += `ORG:${contact.org}\n`;
  if (contact.email) vcard += `EMAIL:${contact.email}\n`;
  vcard += `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;

  return sock.sendMessage(
    jid,
    { contacts: { displayName: contact.name, contacts: [{ vcard }] } },
    { quoted: opts.quoted ?? null }
  );
}

/**
 * Send multiple contact cards in one bubble.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {Array<{ name, number, org? }>} contacts
 * @param {{ quoted? }} opts
 */
export async function sendMultiContact(sock, jid, contacts, opts = {}) {
  const vcards = contacts.map((c) => {
    const num = c.number.replace(/[^0-9]/g, "");
    let v = `BEGIN:VCARD\nVERSION:3.0\nFN:${c.name}\n`;
    if (c.org) v += `ORG:${c.org}\n`;
    v += `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;
    return { vcard: v };
  });
  const displayName =
    contacts.length === 1 ? contacts[0].name : `${contacts.length} Contacts`;

  return sock.sendMessage(
    jid,
    { contacts: { displayName, contacts: vcards } },
    { quoted: opts.quoted ?? null }
  );
}

/**
 * Send a FAKE contact card — custom name on any number.
 * Great for styling bot info cards with ✅ verified-looking name.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ displayName: string, number?: string, org?: string, verified?: boolean }} opts
 * @param {{ quoted? }} msgOpts
 */
export async function sendFakeContact(sock, jid, opts = {}, msgOpts = {}) {
  const {
    displayName = "Yuzuki MD",
    number      = "0000000000",
    org         = "WhatsApp Bot",
    verified    = false,
  } = opts;

  const num   = number.replace(/[^0-9]/g, "") || "0000000000";
  const label = verified ? `✅ ${displayName}` : displayName;

  const vcard =
    `BEGIN:VCARD\nVERSION:3.0\nFN:${label}\n` +
    `ORG:${org}\n` +
    `TEL;type=CELL;type=VOICE;waid=${num}:+${num}\nEND:VCARD`;

  return sock.sendMessage(
    jid,
    { contacts: { displayName: label, contacts: [{ vcard }] } },
    { quoted: msgOpts.quoted ?? null }
  );
}

// ─── Fake Quoted / Fake Reply ─────────────────────────────────────────────────

/**
 * Build a fake quoted object.
 * When used as `{ quoted: createFakeQuoted(...) }` in sendMessage, WA shows a
 * reply bubble from a custom sender name.
 *
 * @param {{
 *   jid?:      string,   — sender JID (default: status@broadcast)
 *   text?:     string,
 *   pushName?: string,
 *   useContact?: boolean — use contactMessage style (verified bot look)
 *   botName?:  string
 * }} opts
 * @returns {object} quoted object
 */
export function createFakeQuoted(opts = {}) {
  const {
    jid        = "0@s.whatsapp.net",
    text       = "",
    pushName   = "Yuzuki MD",
    useContact = false,
    botName    = "Yuzuki MD",
  } = opts;

  if (useContact) {
    return {
      key: {
        fromMe: false,
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
        id: "FAKE_" + Date.now(),
      },
      message: {
        contactMessage: {
          displayName: `✅ ${botName}`,
          vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${botName}\nORG:Verified Bot\nEND:VCARD`,
        },
      },
      pushName: botName,
    };
  }

  return {
    key: {
      fromMe: false,
      participant: jid,
      remoteJid: jid.endsWith("@g.us") ? jid : jid,
      id: "FAKE_" + Date.now(),
    },
    message: { conversation: text },
    pushName,
  };
}

/**
 * Send a message that appears to reply to a fake quoted bubble.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string} text                     — actual message content
 * @param {{ quotedName?, quotedText?, useContact?, botName? }} quoteOpts
 * @param {object} [extra]                  — extra sendMessage options
 */
export async function sendWithFakeQuote(sock, jid, text, quoteOpts = {}, extra = {}) {
  const fakeQuoted = createFakeQuoted({
    pushName:   quoteOpts.quotedName ?? "Yuzuki MD",
    text:       quoteOpts.quotedText ?? "",
    useContact: quoteOpts.useContact ?? false,
    botName:    quoteOpts.botName ?? "Yuzuki MD",
  });

  return sock.sendMessage(jid, { text, ...extra }, { quoted: fakeQuoted });
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

/**
 * Show typing indicator, send message, then clear presence.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string|object} content  — string → { text }, or full message object
 * @param {{ delay?: number, presence?: 'composing'|'recording', quoted? }} opts
 */
export async function sendWithTyping(sock, jid, content, opts = {}) {
  const { delay = 1500, presence = "composing", quoted = null } = opts;

  await sock.sendPresenceUpdate(presence, jid).catch(() => {});
  await new Promise((r) => setTimeout(r, delay));
  await sock.sendPresenceUpdate("paused", jid).catch(() => {});

  const msgContent = typeof content === "string" ? { text: content } : content;
  return sock.sendMessage(jid, msgContent, { quoted });
}

/**
 * Show recording (audio) indicator then send.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {object} content
 * @param {{ delay? }} opts
 */
export async function sendWithRecording(sock, jid, content, opts = {}) {
  return sendWithTyping(sock, jid, content, { ...opts, presence: "recording" });
}

// ─── Location ─────────────────────────────────────────────────────────────────

/**
 * Send a real or spoofed location pin.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ lat: number, lng: number, name?: string, address?: string }} loc
 * @param {{ quoted? }} opts
 */
export async function sendLocation(sock, jid, loc, opts = {}) {
  return sock.sendMessage(
    jid,
    {
      location: {
        degreesLatitude:  loc.lat,
        degreesLongitude: loc.lng,
        name:    loc.name    ?? "",
        address: loc.address ?? "",
      },
    },
    { quoted: opts.quoted ?? null }
  );
}

/** Famous fake locations for fun commands */
export const FAKE_LOCATIONS = {
  tokyo:      { lat: 35.6762,  lng: 139.6503, name: "Tokyo, Japan",         address: "Shinjuku, Tokyo" },
  paris:      { lat: 48.8566,  lng: 2.3522,   name: "Paris, France",        address: "Île-de-France" },
  newyork:    { lat: 40.7128,  lng: -74.0060, name: "New York, USA",         address: "Manhattan, NY" },
  london:     { lat: 51.5074,  lng: -0.1278,  name: "London, UK",            address: "City of Westminster" },
  dubai:      { lat: 25.2048,  lng: 55.2708,  name: "Dubai, UAE",            address: "Burj Khalifa District" },
  mecca:      { lat: 21.3891,  lng: 39.8579,  name: "Mecca, Saudi Arabia",   address: "Al-Masjid Al-Haram" },
  bali:       { lat: -8.4095,  lng: 115.1889, name: "Bali, Indonesia",       address: "Kuta, Bali" },
  sydney:     { lat: -33.8688, lng: 151.2093, name: "Sydney, Australia",     address: "New South Wales" },
};

// ─── Poll ─────────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp poll.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ question: string, options: string[], selectableCount?: number }} poll
 * @param {{ quoted? }} opts
 */
export async function sendPoll(sock, jid, poll, opts = {}) {
  const { question, options, selectableCount = 1 } = poll;
  if (!options?.length || options.length < 2)
    throw new Error("Poll needs at least 2 options");

  return sock.sendMessage(
    jid,
    {
      poll: {
        name:            question,
        values:          options.slice(0, 12), // WA max 12 options
        selectableCount: Math.max(1, Math.min(selectableCount, options.length)),
      },
    },
    { quoted: opts.quoted ?? null }
  );
}

// ─── Reaction ─────────────────────────────────────────────────────────────────

/**
 * React to a message with an emoji.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string} emoji       — emoji string (e.g. "🔥") or "" to remove
 * @param {object} messageKey  — the key of the message to react to
 */
export async function sendReaction(sock, jid, emoji, messageKey) {
  return sock.sendMessage(jid, {
    react: { text: emoji, key: messageKey },
  });
}

// ─── Disappearing / Ephemeral ─────────────────────────────────────────────────

const EPHEMERAL_DURATIONS = {
  "24h": 86400,
  "7d":  604800,
  "90d": 7776000,
  off:   0,
};

/**
 * Send a message that auto-deletes (ephemeral/disappearing).
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string|object} content
 * @param {{ duration?: '24h'|'7d'|'90d', quoted? }} opts
 */
export async function sendEphemeral(sock, jid, content, opts = {}) {
  const { duration = "7d", quoted = null } = opts;
  const exp = EPHEMERAL_DURATIONS[duration] ?? EPHEMERAL_DURATIONS["7d"];
  const msgContent = typeof content === "string" ? { text: content } : content;

  return sock.sendMessage(
    jid,
    { ...msgContent, ephemeralExpiration: exp },
    { quoted }
  );
}

// ─── Link Preview Override ────────────────────────────────────────────────────

/**
 * Send text with a custom link preview thumbnail/title.
 * Overrides WA's automatic link scraping.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {string} text
 * @param {{
 *   title:       string,
 *   body?:       string,
 *   url:         string,
 *   thumbnail?:  Buffer,
 *   mediaType?:  1|2,
 *   renderLarge?: boolean,
 * }} preview
 * @param {{ quoted?, forwardingScore? }} opts
 */
export async function sendWithPreview(sock, jid, text, preview, opts = {}) {
  return sock.sendMessage(
    jid,
    {
      text,
      contextInfo: {
        externalAdReply: {
          title:                  preview.title,
          body:                   preview.body ?? "",
          sourceUrl:              preview.url,
          mediaType:              preview.mediaType ?? 1,
          renderLargerThumbnail:  preview.renderLarge ?? true,
          showAdAttribution:      false,
          ...(preview.thumbnail ? { thumbnail: preview.thumbnail } : {}),
        },
        ...(opts.forwardingScore ? { isForwarded: true, forwardingScore: opts.forwardingScore } : {}),
      },
    },
    { quoted: opts.quoted ?? null }
  );
}

// ─── Carousel ─────────────────────────────────────────────────────────────────

/**
 * Send an image carousel (swipeable cards).
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{
 *   headerText?:   string,
 *   items: Array<{
 *     imageUrl?:  string,
 *     imageBuf?:  Buffer,
 *     title?:     string,
 *     body?:      string,
 *     ctaLabel?:  string,
 *     ctaUrl?:    string,
 *   }>
 * }} carousel
 * @param {{ quoted? }} opts
 */
export async function sendCarousel(sock, jid, carousel, opts = {}) {
  const { createRequire } = await import("module");
  const _require = createRequire(import.meta.url);
  const { generateWAMessageFromContent, prepareWAMessageMedia } = _require("@whiskeysockets/baileys");

  const cards = await Promise.all(
    carousel.items.map(async (item) => {
      let mediaHeader = {};
      const mediaSrc = item.imageBuf
        ? { image: item.imageBuf }
        : item.imageUrl
          ? { image: { url: item.imageUrl } }
          : null;

      if (mediaSrc) {
        mediaHeader = await prepareWAMessageMedia(mediaSrc, {
          upload: sock.waUploadToServer,
        }).catch(() => ({}));
      }

      const buttons = [];
      if (item.ctaUrl) {
        buttons.push({
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: item.ctaLabel ?? "Open",
            url: item.ctaUrl,
            merchant_url: item.ctaUrl,
          }),
        });
      }

      return {
        header: {
          hasMediaAttachment: !!mediaSrc,
          ...mediaHeader,
          title:    item.title    ?? "",
          subtitle: item.subtitle ?? "",
        },
        body: { text: item.body ?? "" },
        nativeFlowMessage: { buttons },
      };
    })
  );

  const carouselMsg = generateWAMessageFromContent(
    jid,
    {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            body: { text: carousel.headerText ?? "" },
            carouselMessage: { cards, messageVersion: 1 },
          },
        },
      },
    },
    { quoted: opts.quoted ?? null }
  );

  await sock.relayMessage(carouselMsg.key.remoteJid, carouselMsg.message, {
    messageId: carouselMsg.key.id,
  });
  return carouselMsg;
}

// ─── Voice Note / PTT ─────────────────────────────────────────────────────────

/**
 * Send an audio file as a voice note (PTT — push to talk bubble).
 *
 * @param {object} sock
 * @param {string} jid
 * @param {Buffer|string} audio   — Buffer or file URL
 * @param {{ quoted?, seconds? }} opts
 */
export async function sendVoiceNote(sock, jid, audio, opts = {}) {
  const content = Buffer.isBuffer(audio) ? audio : { url: audio };
  return sock.sendMessage(
    jid,
    {
      audio:    content,
      mimetype: "audio/ogg; codecs=opus",
      ptt:      true,
      ...(opts.seconds ? { seconds: opts.seconds } : {}),
    },
    { quoted: opts.quoted ?? null }
  );
}

// ─── GIF-style video ─────────────────────────────────────────────────────────

/**
 * Send a video as an auto-playing GIF (gifPlayback: true).
 *
 * @param {object} sock
 * @param {string} jid
 * @param {Buffer|string} video
 * @param {{ caption?, quoted? }} opts
 */
export async function sendGif(sock, jid, video, opts = {}) {
  const content = Buffer.isBuffer(video) ? video : { url: video };
  return sock.sendMessage(
    jid,
    {
      video:       content,
      gifPlayback: true,
      caption:     opts.caption ?? "",
    },
    { quoted: opts.quoted ?? null }
  );
}
