/**
 * YuzukiBuilder — WhatsApp Interactive Message Builder
 *
 * Ported & adapted from OURIN MD 3's NIXCODE builder by Nixel.
 * Integrated into Yuzuki MD V2.
 *
 * Supports:
 *   - NativeFlowCard   → Interactive cards with all button types
 *   - ButtonV2         → Legacy buttonsMessage (up to 3 buttons)
 *   - ListMessage      → WhatsApp list message with sections
 *   - send helpers     → sendInteractive(), sendButtons(), sendList()
 *   - buildNativeFlowWithOffer() → raw nativeFlowMessage with offer badge + list
 */

import {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
} from "@whiskeysockets/baileys";
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
// Mirrors OURIN MD 3's Button class (ourin-builder.js / NIXCODE by Nixel)

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
    this._data = null;
    this._contextInfo = {};
    this._extraPayload = {};
    this._params = {};
    this._currentSelectionIndex = -1;
    this._currentSectionIndex = -1;
  }

  setTitle(v) { this._title = v; return this; }
  setSubtitle(v) { this._subtitle = v; return this; }
  setBody(v) { this._body = v; return this; }
  setFooter(v) { this._footer = v; return this; }
  setMedia(obj) { this._data = obj; return this; }
  setContext(obj) { this._contextInfo = { ...this._contextInfo, ...obj }; return this; }
  setExtra(obj) { this._extraPayload = { ...this._extraPayload, ...obj }; return this; }

  /**
   * Set raw messageParamsJson object.
   * Supports: limited_time_offer, bottom_sheet, tap_target_configuration.
   * @param {object} obj
   */
  setParams(obj) {
    this._params = obj;
    return this;
  }

  /**
   * Activate the WhatsApp offer badge (🏷️ tag icon with expiry + copy code).
   * Sets limited_time_offer in messageParamsJson — matches OURIN MD 3 structure.
   *
   * @param {object|number} [optsOrDurationMs]
   *   Pass an object { text, copyCode, durationMs, url } or a legacy durationMs number.
   * @param {string} [legacyCopyCode]  Legacy second arg for back-compat: setOffer(ms, code)
   */
  setOffer(optsOrDurationMs = {}, legacyCopyCode = "") {
    let text = "", copyCode = "", durationMs = 3_600_000, url = "https://ourin.site";
    if (typeof optsOrDurationMs === "number") {
      durationMs = optsOrDurationMs;
      copyCode = legacyCopyCode;
    } else {
      ({ text = "", copyCode = "", durationMs = 3_600_000, url = "https://ourin.site" } = optsOrDurationMs);
    }
    this._params = {
      ...this._params,
      limited_time_offer: {
        text,
        url,
        copy_code: copyCode,
        expiration_time: Date.now() + durationMs,
      },
    };
    if (copyCode) this._subtitle = copyCode;
    return this;
  }

  /**
   * Activate bottom_sheet mode — controls the "📋 More" button label and list header.
   * @param {object} opts
   * @param {string}   [opts.listTitle]           — Section header inside the dropdown
   * @param {string}   [opts.buttonTitle]         — Label on the "open list" button
   * @param {number}   [opts.inThreadButtonsLimit] — How many buttons show inline (default 2)
   * @param {number[]} [opts.dividerIndices]       — Where to draw dividers (default [1,2,…,999])
   */
  setBottomSheet({ listTitle = "", buttonTitle = "📋 More", inThreadButtonsLimit = 2, dividerIndices = [1, 2, 3, 4, 5, 999] } = {}) {
    this._params = {
      ...this._params,
      bottom_sheet: {
        in_thread_buttons_limit: inThreadButtonsLimit,
        divider_indices: dividerIndices,
        list_title: listTitle,
        button_title: buttonTitle,
      },
    };
    return this;
  }

  // ── Button type: generic ──────────────────────────────────────────────────

  addButton(name, params) {
    this._buttons.push({
      name,
      buttonParamsJson: typeof params === "string" ? params : JSON.stringify(params),
    });
    return this;
  }

  // ── Button type: cta_url ─────────────────────────────────────────────────

  addCtaUrl(label, url, merchantUrl = url, webviewInteraction = false) {
    this._buttons.push({
      name: "cta_url",
      buttonParamsJson: JSON.stringify({
        display_text: label,
        url,
        merchant_url: merchantUrl,
        webview_interaction: webviewInteraction,
      }),
    });
    return this;
  }

  // ── Button type: cta_copy ────────────────────────────────────────────────

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

  // ── Button type: quick_reply ─────────────────────────────────────────────

  addQuickReply(label, id = crypto.randomUUID()) {
    this._buttons.push({
      name: "quick_reply",
      buttonParamsJson: JSON.stringify({ display_text: label, id }),
    });
    return this;
  }

  // ── Button type: cta_call ────────────────────────────────────────────────

  addCall(label, phoneNumber) {
    this._buttons.push({
      name: "cta_call",
      buttonParamsJson: JSON.stringify({ display_text: label, id: phoneNumber }),
    });
    return this;
  }

  // ── Button type: cta_reminder ────────────────────────────────────────────

  addReminder(label, id = crypto.randomUUID()) {
    this._buttons.push({
      name: "cta_reminder",
      buttonParamsJson: JSON.stringify({ display_text: label, id }),
    });
    return this;
  }

  // ── Button type: cta_cancel_reminder ─────────────────────────────────────

  addCancelReminder(label, id = crypto.randomUUID()) {
    this._buttons.push({
      name: "cta_cancel_reminder",
      buttonParamsJson: JSON.stringify({ display_text: label, id }),
    });
    return this;
  }

  // ── Button type: address_message ─────────────────────────────────────────

  addAddress(label, id = crypto.randomUUID()) {
    this._buttons.push({
      name: "address_message",
      buttonParamsJson: JSON.stringify({ display_text: label, id }),
    });
    return this;
  }

  // ── Button type: send_location ───────────────────────────────────────────

  addLocation(opts = {}) {
    this._buttons.push({
      name: "send_location",
      buttonParamsJson: JSON.stringify(opts),
    });
    return this;
  }

  // ── Button type: single_select (simple one-call) ──────────────────────────

  /**
   * Add a single-select dropdown in one call.
   * @param {string} label  — Button label
   * @param {string} sectionTitle — Section header
   * @param {Array<{id?:string,title:string,description?:string,header?:string}>} rows
   */
  addSelect(label, sectionTitle, rows = []) {
    this._buttons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({
        title: label,
        sections: [{ title: sectionTitle, rows }],
      }),
    });
    return this;
  }

  // ── Button type: single_select (fluent builder) ───────────────────────────

  /**
   * Start a new single_select button (fluent).
   * Chain .makeSection() → .makeRow() to fill it.
   * @param {string} title — Button label shown in the "More" sheet
   * @param {object} [opts] — Extra buttonParamsJson fields, e.g. { has_multiple_buttons: true }
   */
  addSelection(title, opts = {}) {
    this._buttons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({ title, sections: [], ...opts }),
    });
    this._currentSelectionIndex = this._buttons.length - 1;
    this._currentSectionIndex = -1;
    return this;
  }

  /**
   * Add a section to the most recent addSelection().
   * @param {string} [title]
   * @param {string} [highlightLabel]
   */
  makeSection(title = "", highlightLabel = "") {
    if (this._currentSelectionIndex === -1) throw new Error("Call addSelection() first");
    const p = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
    p.sections.push({ title, highlight_label: highlightLabel, rows: [] });
    this._currentSectionIndex = p.sections.length - 1;
    this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(p);
    return this;
  }

  /**
   * Add a row to the most recent makeSection().
   * @param {string} [header]
   * @param {string} [title]
   * @param {string} [description]
   * @param {string} [id]
   */
  makeRow(header = "", title = "", description = "", id = crypto.randomUUID()) {
    if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) {
      throw new Error("Call addSelection() then makeSection() first");
    }
    const p = JSON.parse(this._buttons[this._currentSelectionIndex].buttonParamsJson);
    p.sections[this._currentSectionIndex].rows.push({ header, title, description, id });
    this._buttons[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(p);
    return this;
  }

  // ─────────────────────────────────────────────────────────────────────────

  async _toCard() {
    return {
      header: {
        title: this._title,
        subtitle: this._subtitle,
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
        interactiveMessage: {
          ...card,
          contextInfo: this._contextInfo,
        },
      },
      { ...opts }
    );
  }

  async send(jid, opts = {}) {
    const msg = await this.build(jid, opts);
    await this.#sock.relayMessage(msg.key.remoteJid, msg.message, {
      messageId: msg.key.id,
      additionalNodes: [
        {
          tag: "biz",
          attrs: {},
          content: [
            {
              tag: "interactive",
              attrs: { type: "native_flow", v: "1" },
              content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
            },
          ],
        },
      ],
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
      additionalNodes: [
        {
          tag: "biz",
          attrs: {},
          content: [
            {
              tag: "interactive",
              attrs: { type: "native_flow", v: "1" },
              content: [{ tag: "native_flow", attrs: { v: "9", name: "mixed" } }],
            },
          ],
        },
      ],
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

export async function sendInteractive(sock, jid, { title = "", body, footer = "", buttons = [], media = null } = {}) {
  const card = new NativeFlowCard(sock).setTitle(title).setBody(body).setFooter(footer);
  if (media) card.setMedia(media);
  for (const btn of buttons) {
    if (btn.type === "copy")     card.addCtaCopy(btn.label, btn.value);
    else if (btn.type === "select") card.addSelect(btn.label, btn.title || "Options", btn.rows || []);
    else if (btn.type === "reply")  card.addQuickReply(btn.label, btn.id);
    else if (btn.type === "call")   card.addCall(btn.label, btn.phone ?? btn.id);
    else card.addCtaUrl(btn.label, btn.url, btn.merchantUrl);
  }
  return card.send(jid);
}

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

export async function sendList(sock, jid, { title = "", body, footer = "", buttonText = "Select", sections = [] } = {}) {
  const l = new ListMessage(sock)
    .setTitle(title)
    .setBody(body)
    .setFooter(footer)
    .setButtonText(buttonText);
  for (const s of sections) l.addSection(s.title, s.rows);
  return l.send(jid);
}

/**
 * Build a raw nativeFlowMessage object with an offer badge + bottom_sheet list.
 * Matches OURIN MD 3's messageParamsJson structure exactly.
 *
 * Usage:
 *   const { nativeFlowMessage } = buildNativeFlowWithOffer({
 *     text: "Good Evening 🌙",
 *     copyCode: "Yuzuki MD",
 *     durationMs: 3600000,
 *     listTitle: "Pick a category",
 *     buttonTitle: "📋 More",
 *     buttons: [{ id: ".menu", title: "Main Menu" }],
 *   });
 *   // then use nativeFlowMessage inside your interactiveMessage payload
 *
 * @param {object} opts
 * @param {string}   [opts.text]              — Offer badge text (shown in 🏷️ overlay)
 * @param {string}   [opts.copyCode]          — Copy-code inside the badge
 * @param {number}   [opts.durationMs]        — Offer lifetime in ms (default 1 hour)
 * @param {string}   [opts.offerUrl]          — URL for the offer badge (default ourin.site)
 * @param {string}   [opts.listTitle]         — Section header in the dropdown list
 * @param {string}   [opts.buttonTitle]       — Label on the "open list" button
 * @param {number}   [opts.inThreadLimit]     — Inline button count before sheet (default 2)
 * @param {Array}    [opts.buttons]           — Rows: { id?, command?, title?, name?, label?, description? }
 * @param {Array}    [opts.extraButtons]      — Additional buttons appended after the single_select
 * @returns {{ text, copyCode, nativeFlowMessage }}
 */
export function buildNativeFlowWithOffer({
  text = "",
  copyCode = "",
  durationMs = 3_600_000,
  offerUrl = "https://ourin.site",
  listTitle = "",
  buttonTitle = "📋 More",
  inThreadLimit = 2,
  buttons = [],
  extraButtons = [],
} = {}) {
  const params = {
    limited_time_offer: {
      text,
      url: offerUrl,
      copy_code: copyCode,
      expiration_time: Date.now() + durationMs,
    },
    bottom_sheet: {
      in_thread_buttons_limit: inThreadLimit,
      divider_indices: [1, 2, 3, 4, 5, 999],
      list_title: listTitle,
      button_title: buttonTitle,
    },
    tap_target_configuration: {
      title: " X ",
      description: "Yuzuki MD",
      canonical_url: offerUrl,
      domain: "ourin.site",
      button_index: 0,
    },
  };

  const rows = buttons.map((btn) => ({
    id: btn.id ?? btn.command ?? btn.rowId ?? crypto.randomUUID(),
    title: btn.title ?? btn.name ?? btn.label ?? "",
    description: btn.description ?? btn.desc ?? "",
    header: btn.header ?? "",
  }));

  const nativeButtons = [];

  if (rows.length > 0) {
    nativeButtons.push({
      name: "single_select",
      buttonParamsJson: JSON.stringify({ has_multiple_buttons: true }),
    });
  }

  for (const eb of extraButtons) {
    nativeButtons.push({
      name: eb.name,
      buttonParamsJson: typeof eb.buttonParamsJson === "string"
        ? eb.buttonParamsJson
        : JSON.stringify(eb.buttonParamsJson ?? {}),
    });
  }

  return {
    text,
    copyCode,
    rows,
    nativeFlowMessage: {
      messageParamsJson: JSON.stringify(params),
      buttons: nativeButtons,
    },
  };
}
