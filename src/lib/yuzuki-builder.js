/**
 * YuzukiBuilder — WhatsApp Interactive Message Builder
 *
 * Ported & adapted from Yuzuki MD's NIXCODE builder by Nixel.
 * Integrated into Yuzuki MD V2 by the merge team.
 *
 * Supports:
 *   - NativeFlowCard   → Interactive cards with buttons (CTA, quick_reply, select, copy)
 *   - ButtonV2         → Legacy buttonsMessage (up to 3 buttons)
 *   - ListMessage      → WhatsApp list message with sections
 *   - send helpers     → sendInteractive(), sendButtons(), sendList()
 */

import { createRequire } from "module";
const _require = createRequire(import.meta.url);
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} = _require("@whiskeysockets/baileys");
import crypto from "crypto";
import sharp from "sharp";

// ─── Utility ────────────────────────────────────────────────────────────────

async function fetchBuffer(url, opts = {}) {
  const { default: axios } = await import("axios");
  const res = await axios.get(url, { responseType: "arraybuffer", timeout: 15000, ...opts });
  return Buffer.from(res.data);
}

async function resizeImage(buf, w = 300, h = 300) {
  return sharp(buf).resize(w, h, { fit: "cover" }).jpeg({ quality: 80 }).toBuffer();
}

// ─── NativeFlowCard ──────────────────────────────────────────────────────────

export class NativeFlowCard {
  #sock;

  constructor(sock) {
    if (!sock) throw new Error("sock (Baileys socket) is required");
    this.#sock = sock;
    this._title = "";
    this._subtitle = "";
    this._body = "";
    this._footer = "";
    this._buttons = [];
    this._data = null;        // media payload
    this._contextInfo = {};
    this._extraPayload = {};
    this._params = {};
    this._copyCode = "";         // offer badge copy code
  }

  setTitle(v) { this._title = v; return this; }
  setSubtitle(v) { this._subtitle = v; return this; }
  setBody(v) { this._body = v; return this; }
  setFooter(v) { this._footer = v; return this; }
  setMedia(obj) { this._data = obj; return this; }
  setContext(obj) { this._contextInfo = { ...this._contextInfo, ...obj }; return this; }
  setExtra(obj) { this._extraPayload = { ...this._extraPayload, ...obj }; return this; }

  /**
   * Activate the WhatsApp offer badge (the 🏷️ tag icon with expiry date and copy code).
   * Sets messageParamsJson so WhatsApp renders the offer frame around the header.
   * @param {number} [durationMs]  How long before it shows "Offer ended". Default = never.
   * @param {string} [copyCode]    Text shown as "Code: <copyCode>" inside the badge.
   */
  setOffer(durationMs = 99999999999, copyCode = "") {
    const nowSec = Math.floor(Date.now() / 1000);
    this._params = { from: nowSec, to: nowSec + Math.floor(durationMs / 1000) };
    if (copyCode) this._copyCode = copyCode;
    return this;
  }

  /**
   * Add a CTA URL button
   * @param {string} label
   * @param {string} url
   * @param {string} [merchantUrl]
   */
  addCtaUrl(label, url, merchantUrl = url) {
    this._buttons.push({
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: label,
        url,
        merchant_url: merchantUrl,
      }),
    });
    return this;
  }

  /**
   * Add a Copy button
   * @param {string} label
   * @param {string} textToCopy
   */
  addCtaCopy(label, textToCopy) {
    this._buttons.push({
      name: "cta_copy",
      buttonParamsJson: JSON.stringify({
        display_text: label,
        copy_code: textToCopy,
      }),
    });
    return this;
  }

  /**
   * Add a quick reply button
   * @param {string} label
   * @param {string} [id]
   */
  addQuickReply(label, id = crypto.randomUUID()) {
    this._buttons.push({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({
        display_text: label,
        id,
      }),
    });
    return this;
  }

  /**
   * Add a single-select dropdown
   * @param {string} label       — Button label
   * @param {string} title       — Dropdown title
   * @param {Array<{id:string,title:string,description?:string}>} rows
   */
  addSelect(label, title, rows = []) {
    this._buttons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: label,
        sections: [{ title, rows }],
      }),
    });
    return this;
  }

  async _toCard() {
    return {
      header: {
        title: this._title,
        subtitle: this._copyCode || this._subtitle,
        hasMediaAttachment: !!this._data,
        ...(this._data
          ? await prepareWAMessageMedia(this._data, {
              upload: this.#sock.waUploadToServer,
            }).catch((e) => {
              if (String(e).includes("Invalid media type")) return this._data;
              throw e;
            })
          : {}),
      },
      body: { text: this._body },
      footer: { text: this._footer },
      nativeFlowMessage: {
        messageParamsJson: JSON.stringify(this._params),
        buttons: this._buttons,
      },
    };
  }

  async build(jid, opts = {}) {
    const card = await this._toCard();
    return generateWAMessageFromContent(
      jid,
      {
        ...this._extraPayload,
        viewOnceMessage: {
          message: {
            messageContextInfo: {
              deviceListMetadata: {},
              deviceListMetadataVersion: 2,
            },
            interactiveMessage: {
              ...card,
              contextInfo: this._contextInfo,
            },
          },
        },
      },
      { ...opts }
    );
  }

  async send(jid, opts = {}) {
    const msg = await this.build(jid, opts);
    await this.#sock.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      ...opts,
    });
    return msg;
  }
}

// ─── ButtonV2 (legacy buttonsMessage) ────────────────────────────────────────

export class ButtonV2 {
  #sock;

  constructor(sock) {
    if (!sock) throw new Error("sock is required");
    this.#sock = sock;
    this._body = "";
    this._footer = "";
    this._title = "";
    this._subtitle = "";
    this._buttons = [];
    this._image = null;
    this._data = null;
    this._contextInfo = {};
    this._extraPayload = {};
  }

  setBody(v) { this._body = v; return this; }
  setFooter(v) { this._footer = v; return this; }
  setTitle(v) { this._title = v; return this; }
  setSubtitle(v) { this._subtitle = v; return this; }
  setMedia(obj) { this._data = obj; return this; }
  setThumbnail(urlOrBuf) { this._image = urlOrBuf; return this; }
  setContext(obj) { this._contextInfo = { ...this._contextInfo, ...obj }; return this; }
  setExtra(obj) { this._extraPayload = { ...this._extraPayload, ...obj }; return this; }

  addButton(text, id = crypto.randomUUID()) {
    this._buttons.push({
      buttonId: id,
      buttonText: { displayText: text },
      type: 1,
    });
    return this;
  }

  async build(jid, opts = {}) {
    let thumb = null;
    if (this._image) {
      const raw = Buffer.isBuffer(this._image)
        ? this._image
        : await fetchBuffer(this._image).catch(() => null);
      if (raw) thumb = await resizeImage(raw, 300, 300).catch(() => null);
    }

    return generateWAMessageFromContent(
      jid,
      {
        ...this._extraPayload,
        buttonsMessage: {
          contentText: this._body,
          footerText: this._footer,
          ...(this._data
            ? this._data
            : {
                headerType: 6,
                locationMessage: {
                  degreesLatitude: 0,
                  degreesLongitude: 0,
                  name: this._title,
                  address: this._subtitle,
                  jpegThumbnail: thumb,
                },
              }),
          viewOnce: true,
          contextInfo: this._contextInfo,
          buttons: [...this._buttons],
        },
      },
      { ...opts }
    );
  }

  async send(jid, opts = {}) {
    const msg = await this.build(jid, opts);
    await this.#sock.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      ...opts,
    });
    return msg;
  }
}

// ─── ListMessage ──────────────────────────────────────────────────────────────

export class ListMessage {
  #sock;

  constructor(sock) {
    if (!sock) throw new Error("sock is required");
    this.#sock = sock;
    this._title = "";
    this._body = "";
    this._footer = "";
    this._buttonText = "Select";
    this._sections = [];
    this._contextInfo = {};
  }

  setTitle(v) { this._title = v; return this; }
  setBody(v) { this._body = v; return this; }
  setFooter(v) { this._footer = v; return this; }
  setButtonText(v) { this._buttonText = v; return this; }
  setContext(obj) { this._contextInfo = { ...this._contextInfo, ...obj }; return this; }

  /**
   * @param {string} sectionTitle
   * @param {Array<{rowId:string,title:string,description?:string}>} rows
   */
  addSection(sectionTitle, rows) {
    this._sections.push({ title: sectionTitle, rows });
    return this;
  }

  async send(jid, opts = {}) {
    return this.#sock.sendMessage(
      jid,
      {
        listMessage: {
          title: this._title,
          description: this._body,
          footerText: this._footer,
          buttonText: this._buttonText,
          listType: 1,
          sections: this._sections,
          contextInfo: this._contextInfo,
        },
      },
      { ...opts }
    );
  }
}

// ─── Convenience helpers ──────────────────────────────────────────────────────

/**
 * Quick NativeFlowCard with one or more CTA URL buttons.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ title, body, footer, buttons: Array<{label,url}>, media? }} opts
 */
export async function sendInteractive(sock, jid, { title = "", body, footer = "", buttons = [], media = null } = {}) {
  const card = new NativeFlowCard(sock).setTitle(title).setBody(body).setFooter(footer);
  if (media) card.setMedia(media);
  for (const btn of buttons) {
    if (btn.type === "copy")     card.addCtaCopy(btn.label, btn.value);
    else if (btn.type === "select") card.addSelect(btn.label, btn.title || "Options", btn.rows || []);
    else if (btn.type === "reply")  card.addQuickReply(btn.label, btn.id);
    else card.addCtaUrl(btn.label, btn.url, btn.merchantUrl);
  }
  return card.send(jid);
}

/**
 * Quick ButtonV2 (legacy, max 3 buttons).
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ title, subtitle, body, footer, buttons: Array<{text,id}>, thumbnail? }} opts
 */
export async function sendButtons(sock, jid, { title = "", subtitle = "", body, footer = "", buttons = [], thumbnail = null } = {}) {
  const b = new ButtonV2(sock)
    .setTitle(title)
    .setSubtitle(subtitle)
    .setBody(body)
    .setFooter(footer);
  if (thumbnail) b.setThumbnail(thumbnail);
  for (const btn of buttons.slice(0, 3)) b.addButton(btn.text, btn.id);
  return b.send(jid);
}

/**
 * Quick ListMessage.
 *
 * @param {object} sock
 * @param {string} jid
 * @param {{ title, body, footer, buttonText, sections }} opts
 */
export async function sendList(sock, jid, { title = "", body, footer = "", buttonText = "Select", sections = [] } = {}) {
  const l = new ListMessage(sock)
    .setTitle(title)
    .setBody(body)
    .setFooter(footer)
    .setButtonText(buttonText);
  for (const s of sections) l.addSection(s.title, s.rows);
  return l.send(jid);
}
