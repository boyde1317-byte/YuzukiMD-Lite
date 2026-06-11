import os from "os";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { exec } from "child_process";
import { fileURLToPath } from "url";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.resolve(__dirname, "../data");
import { promisify } from "util";
import {
  loadSettings,
  setSetting,
  isOwner,
  getOwners,
  addOwner,
  removeOwner,
  getKeys,
  addKey,
  removeKey,
  getResellers,
  addReseller,
  removeReseller,
  resetReseller,
  getCases,
  addCase,
  removeCase,
  editCase,
} from "./settings.js";
import { clearSession, stopBot, startBot, state as botState } from "./bot.js";
import { pushToGitHub, pullFromGitHub, getChangelog } from "./utils/github.js";
import { card, toast, toggle, listCard, progress, previewCard } from "./utils/ui.js";
import { CATEGORIES, buildMain, buildSub, buildListPayload, MENU_BG } from "./menu.js";
// ── Yuzuki Plugin System ────────────────────────────────────────────────────
import { getPlugin, getPluginStats, getPluginsByCategory } from "./lib/plugin-loader.js";
import { createMessageObject } from "./lib/legacy-compat.js";
// ── UI Tricks & Builders ──────────────────────────────────────────────────
import { NativeFlowCard, ButtonV2, sendInteractive, sendButtons, sendList, buildNativeFlowWithOffer } from "./lib/yuzuki-builder.js";
import { sendForwarded, sendAdReply, sendNewsletterStyle, sendAnnouncementCard, sendPremiumStyle } from "./lib/msg-tricks.js";
import { broadcastJPM, broadcastText } from "./lib/jpm.js";
import { sendContact, sendMultiContact, sendFakeContact, createFakeQuoted, sendWithFakeQuote, sendWithTyping, sendWithRecording, sendLocation, FAKE_LOCATIONS, sendPoll, sendReaction, sendEphemeral, sendWithPreview, sendCarousel, sendVoiceNote, sendGif } from "./lib/msg-types.js";
// Free AI — no API keys required (Pollinations.AI + StreamElements + Groq)
import QRCode from "qrcode";
import ytdl from "@distube/ytdl-core";
import {
  downloadMediaMessage,
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} from "@whiskeysockets/baileys";
// ── . merged scrapers & libs ──────────────────────────────────────────
import { tiktokDl } from "./lib/scrape/tiktok.js";
import { igdl as igDl } from "./lib/scrape/instagram.js";
import { ytmp3 as ytDlMp3, ytmp4 as ytDlMp4, ytSearch as ytSearchFn, searchSaavn, searchDeezer, getLyrics } from "./lib/scrape/youtube.js";
import { spotifyScrape, searchSpotify } from "./lib/scrape/spotify.js";
import { searchPinterestAPI, downloadPin as downloadPinUrl } from "./lib/scrape/pinterest.js";
import { searchDafont } from "./lib/scrape/dafont.js";
import { mathgpt } from "./lib/scrape/mathgpt.js";
import { FeloClient } from "./lib/scrape/feloai.js";
import { chatex } from "./lib/scrape/chatexai.js";
import { makeBrat, makeBratVid, makeQC, toSticker } from "./lib/maker.js";
import {
  initUserDB, loadDB, saveDB,
  getLimitCost, setLimitCost,
  checkLimit, useLimit,
  addXP, addCoins, spendCoins, getLeaderboard, getRankPosition,
} from "./lib/database.js";
import { antilinkDetector, getGroupData, setGroupData } from "./lib/protect.js";
const execAsync = promisify(exec);
async function polliText(messages,model="openai"){const r=await fetch("https://text.pollinations.ai/",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages,model,seed:-1,private:false})});if(!r.ok)throw new Error(`Pollinations API error: ${r.status}`);return(await r.text()).trim();}
async function dlQuoted(msg,jid){const ctx=msg.message?.extendedTextMessage?.contextInfo;if(!ctx?.quotedMessage)return null;const fm={key:{remoteJid:jid,id:ctx.stanzaId,fromMe:ctx.fromMe??false,participant:ctx.participant},message:ctx.quotedMessage};return{buf:await downloadMediaMessage(fm,"buffer",{}),qm:ctx.quotedMessage};}
const INVIDIOUS=["https://iv.ggtyler.dev","https://invidious.nerdvpn.de","https://invidious.perennialte.ch"];
async function ytSearch(q){for(const b of INVIDIOUS){try{const r=await fetch(`${b}/api/v1/search?q=${encodeURIComponent(q)}&type=video`,{signal:AbortSignal.timeout(7000)});if(r.ok)return await r.json();}catch{}}return null;}
async function invGet(path){for(const b of INVIDIOUS){try{const r=await fetch(`${b}${path}`,{signal:AbortSignal.timeout(7000)});if(r.ok)return await r.json();}catch{}}return null;}
function extractVid(url){const m=url?.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/);return m?.[1]??null;}
function extractPid(url){const m=url?.match(/list=([a-zA-Z0-9_-]+)/);return m?.[1]??null;}
function fmtNum(n){if(!n)return "N/A";const x=parseInt(n);if(x>=1e9)return(x/1e9).toFixed(1)+"B";if(x>=1e6)return(x/1e6).toFixed(1)+"M";if(x>=1e3)return(x/1e3).toFixed(1)+"K";return x.toLocaleString();}
function fmtDur(s){const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;if(d>0)return`${d}d ${h}h ${m}m`;if(h>0)return`${h}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")}`;return`${m}:${String(sec).padStart(2,"0")}`;}
const gameStates=new Map();
function tttBoard(b){const s=(i)=>b[i]||String(i+1);return`${s(0)}|${s(1)}|${s(2)}\n-+-+-\n${s(3)}|${s(4)}|${s(5)}\n-+-+-\n${s(6)}|${s(7)}|${s(8)}`;}
function tttWin(b,p){return[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]].some(([a,c,d])=>b[a]===p&&b[c]===p&&b[d]===p);}
function tttBot(b){const e=b.map((v,i)=>v?null:i).filter(v=>v!==null);for(const i of e){const t=[...b];t[i]="O";if(tttWin(t,"O"))return i;}for(const i of e){const t=[...b];t[i]="X";if(tttWin(t,"X"))return i;}if(b[4]===null)return 4;return e[Math.floor(Math.random()*e.length)];}
const HM_WORDS=["javascript","programming","elephant","adventure","chocolate","university","basketball","watermelon","technology","friendship","butterfly","strawberry","dangerous","knowledge","dictionary","television","helicopter","constitution","multiplication","championship"];
function hmFig(w){const s=["   \n   |\n   |\n   |\n=====","  _\n  |\n   |\n   |\n=====","  _\n  | |\n  O  |\n     |\n     |\n=====","  _\n  | |\n  O  |\n  |  |\n     |\n=====","  _\n  | |\n  O  |\n /|  |\n     |\n=====","  _\n  | |\n  O  |\n /|\\ |\n     |\n=====","  _\n  | |\n  O  |\n /|\\ |\n /   |\n=====","  _\n  | |\n  O  |\n /|\\ |\n / \\ |\n====="];return"```\n"+s[Math.min(w,7)]+"\n```";}
function bjDeck(){const su=["♠","♥","♦","♣"],ra=["A","2","3","4","5","6","7","8","9","10","J","Q","K"],d=[];for(const s of su)for(const r of ra)d.push(r+s);for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
function bjVal(h){let v=0,a=0;for(const c of h){const r=c.slice(0,-1);if(r==="A"){v+=11;a++;}else if(["J","Q","K"].includes(r))v+=10;else v+=parseInt(r);}while(v>21&&a>0){v-=10;a--;}return v;}


  /**
   * Returns a fake "verified contact" quoted context.
   * When passed as { quoted: ... } in sendMessage, WhatsApp renders
   * the reply header as a contact card — giving the bot a verified-looking badge.
   *
   * Fixes vs original snippet:
   *  - sendEphemeral was incorrectly placed inside contactMessage (invalid field) — removed
   *  - displayName and vcard now use the live bot name + number instead of hardcoded values
   */
  function getVerifiedQuoted(settings) {
    const botName = settings.botName ?? "Yuzuki MD";
    const botNumber = (botState.phoneNumber ?? "0").replace(/[^0-9]/g, "");
    return {
      key: {
        participant: "0@s.whatsapp.net",
        remoteJid: "status@broadcast",
      },
      message: {
        contactMessage: {
          displayName: `🗽 ${botName}`,
          vcard: [
            "BEGIN:VCARD",
            "VERSION:3.0",
            `N:;${botName};;;`,
            `FN:${botName}`,
            `item1.TEL;waid=13135550002:+1 (313) 555-0002`,
            "item1.X-ABLabel:Ponsel",
            "END:VCARD",
          ].join("\n"),
        },
      },
    };
  }

  const startTime = Date.now();

// ── Per-command thumbnail helper ──────────────────────────────────────────────
// Looks for src/assets/<name>.(jpg|png|jpeg|webp). Falls back to MENU_BG.
// MENU_BG may be an HTTPS URL (GitHub CDN) — fetch it via HTTP in that case.
// Results are cached in memory so CDN is only hit once per key per process lifetime.
const _thumbCache = new Map();

async function getThumb(name) {
  if (_thumbCache.has(name)) return _thumbCache.get(name);

  const isUrl = (s) => /^https?:\/\//i.test(s);
  let result = null;

  if (!isUrl(MENU_BG)) {
    const dir = path.dirname(MENU_BG);
    for (const ext of ["jpg", "png", "jpeg", "webp"]) {
      const p = path.join(dir, `${name}.${ext}`);
      if (fs.existsSync(p)) { result = fs.readFileSync(p); break; }
    }
    if (!result && fs.existsSync(MENU_BG)) result = fs.readFileSync(MENU_BG);
  } else {
    // URL-based assets (GitHub Releases CDN) — fetch once, cache forever
    if (_thumbCache.has("__menu_bg__")) {
      result = _thumbCache.get("__menu_bg__");
    } else {
      try {
        const { default: axios } = await import("axios");
        const res = await axios.get(MENU_BG, { responseType: "arraybuffer", timeout: 8000 });
        result = Buffer.from(res.data);
        _thumbCache.set("__menu_bg__", result);
      } catch {
        result = null;
      }
    }
  }

  if (result) _thumbCache.set(name, result);
  return result;
}

const OWNER_COMMANDS = new Set([
  "setprefix","setowner","addowner","delowner","setbotname",
  "public","self","antidelete","gconly","autoblock",
  "clearchat","clearsession","restart","setmenuimg",
  "setchannelid","setchannelname",
  "addreseller","delreseller","resetreseller",
  "addkey","delkey",
  "addcase","delcase","editcase",
  "push","update","changelog",
  "givexp","addcoins","resetprofile",
]);

export async function handleCommand({ sock, msg, command, args }) {
  const jid = msg.key.remoteJid;
  const settings = loadSettings();
  const prefix = settings.prefix ?? ".";
  // FIX: For linked-device bots, fromMe means the owner sent this.
  // In DMs, participant is absent and remoteJid is the *other* person,
  // so use the bot's own JID when fromMe is true.
  const senderJid = msg.key.fromMe
    ? `${botState.phoneNumber ?? "0"}@s.whatsapp.net`
    : (msg.key.participant ?? msg.key.remoteJid ?? "");

  const reply = async (text) => {
    try {
      await sock.sendMessage(jid, { text }, { quoted: msg });
    } catch (err) {
      console.error(`[reply] Failed to send message to ${jid}:`, err?.message ?? err);
    }
  };

  const channelQuote = (settings.channelId && settings.channelName)
    ? {
        key: {
          remoteJid: "status@broadcast",
          participant: "0@s.whatsapp.net",
          id: "BAE5" + Math.random().toString(36).slice(2, 10).toUpperCase(),
        },
        message: {
          newsletterAdminInviteMessage: {
            newsletterJid: settings.channelId,
            newsletterName: settings.channelName,
            caption: "Made with ♥️ By Aizen",
            inviteExpiration: Math.floor(Date.now() / 1000) + 86400 * 7,
          },
        },
      }
    : null;

  // replyChannel: use channel quote if configured; if it throws the message
  // was already delivered (newsletter ack error), so do NOT retry to avoid duplicates.
  // If no channel quote is set, fall straight to a plain reply.
  const replyChannel = async (text) => {
    if (!channelQuote) {
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
    try {
      await sock.sendMessage(jid, { text }, { quoted: channelQuote });
    } catch {
      // Channel ack failed — message already sent, skip retry to prevent double reply
    }
  };

  // replyWithThumb: send an image from src/assets/<thumbName>.(jpg|png…) with
  // the caption as the message body. Falls back to plain text on error.
  const replyWithThumb = async (thumbName, caption) => {
    try {
      const thumb = await getThumb(thumbName);
      await sock.sendMessage(jid, { image: thumb, caption }, { quoted: channelQuote || msg });
    } catch {
      await replyChannel(caption);
    }
  };


    // Sends with verified contact card quote — falls back to plain reply if it fails
    const replyVerified = async (text) => {
      try {
        await sock.sendMessage(jid, { text }, { quoted: getVerifiedQuoted(settings) });
      } catch {
        await sock.sendMessage(jid, { text }, { quoted: msg });
      }
    };

  const sender = senderJid;
  const pushname = msg.pushName ?? "User";
  const text = args.join(" ").trim();

  // ── Auto-award XP on every command ───────────────────────────────────────────
  try {
    const xpGain = Math.floor(Math.random() * 5) + 3; // 3–7 XP per command
    const xpResult = addXP(sender, xpGain, pushname);
    if (xpResult.leveled) {
      setTimeout(() => {
        sock.sendMessage(jid, {
          text: `🎉 *Level Up!* @${sender.split("@")[0].split(":")[0]}\n\n⭐ You are now *Level ${xpResult.newLevel}*! Keep it up 🔥`,
          mentions: [sender],
        }).catch(() => {});
      }, 800);
    }
  } catch {}

  if (OWNER_COMMANDS.has(command)) {
    if (!isOwner(senderJid, settings)) {
      await reply("This command is restricted to bot owners.");
      return;
    }
  }

  switch (command) {


    // ── Direct sub-menu shortcuts (.ai, .tools, .fun, etc.) ──────────────────
    case "ai":
    case "tools":
    case "fun":
    case "game":
    case "general":
    case "group":
    case "owner":
    case "profile":
    case "search":
    case "youtube":
    case "downloader": {
      const botName2 = settings.botName ?? "Yuzuki";
      const imageUrl2 = settings.menuBgUrl || MENU_BG;
      const subCaption = buildSub(botName2, prefix, command);
      if (!subCaption) { await reply(`Unknown category: ${command}`); break; }

      const vq2 = getVerifiedQuoted(settings);
      let thumbnail2;
      try { const tr = await fetch("https://www.upload.ee/image/19419994/file.jpg"); thumbnail2 = Buffer.from(await tr.arrayBuffer()); } catch { thumbnail2 = undefined; }
      const ctx2 = {
        forwardingScore: 2025, isForwarded: true,
        ...(settings.channelId && settings.channelName ? { forwardedNewsletterMessageInfo: { newsletterJid: settings.channelId, serverMessageId: null, newsletterName: settings.channelName } } : {}),
        externalAdReply: { title: botName2, body: `${botName2} Bot`, mediaType: 1, previewType: 0, thumbnail: thumbnail2, thumbnailUrl: "https://www.upload.ee/image/19419994/file.jpg", renderLargerThumbnail: true, sourceUrl: "t.me//DeathCore_Xr", mediaUrl: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326" },
        quotedMessage: vq2.message, participant: vq2.key.participant, remoteJid: vq2.key.remoteJid,
      };
      try { await sock.sendMessage(jid, { image: { url: imageUrl2 }, caption: subCaption, contextInfo: ctx2 }); }
      catch { await reply(subCaption); }
      break;
    }

    case "menu": {
      const botName = settings.botName ?? "Yuzuki";
      const sub = args[0]?.toLowerCase();

      // ── Sub-menu: .menu ai, .menu tools, etc. ──────────────────────────
      if (sub && CATEGORIES[sub]) {
        const caption = buildSub(botName, prefix, sub);
        const vq = getVerifiedQuoted(settings);
        const subCtx = {
          forwardingScore: 2025,
          isForwarded: true,
          ...(settings.channelId && settings.channelName ? {
            forwardedNewsletterMessageInfo: {
              newsletterJid: settings.channelId,
              serverMessageId: null,
              newsletterName: settings.channelName,
            },
          } : {}),
          quotedMessage: vq.message,
          participant: vq.key.participant,
          remoteJid: vq.key.remoteJid,
        };
        try {
          const subCard = new NativeFlowCard(sock);
          subCard
            .setBody(caption)
            .setFooter(`${prefix}allmenu — full command list`)
            .addQuickReply("🏠 Back to Main Menu", `${prefix}menu`)
            .setContext(subCtx);
          await subCard.send(jid);
        } catch {
          await reply(caption);
        }
        break;
      }

      // ── Main menu: image + rich caption with live stats ──────────────────
      // Gather runtime data
      const db = loadDB();
      const totalUsers = Object.keys(db.users ?? {}).length;
      const totalCmds = Object.values(CATEGORIES).reduce((a, c) => a + c.commands.length, 0);
      const uptimeMs = Date.now() - startTime;
      const uptimeSec = Math.floor(uptimeMs / 1000);
      const uptimeMin = Math.floor(uptimeSec / 60);
      const uptimeHr = Math.floor(uptimeMin / 60);
      const uptimeDays = Math.floor(uptimeHr / 24);
      const uptimeStr = `${uptimeDays}d ${uptimeHr % 24}h ${uptimeMin % 60}m ${uptimeSec % 60}s`;
      const pushname = msg.pushName ?? "User";
      const userRank = isOwner(senderJid, settings) ? "Owner 👑" : "User 🌟";
      const ownerNumber = (settings.ownerNumber ?? "").replace(/\D/g, "");

      const menuCaption = buildMain(botName, prefix, { pushname, userRank, uptimeStr, totalUsers, totalCmds, ownerNumber });
      // Known-good thumbnail URL — same one used by .tools/.fun/etc sub-menus which work.
      // MENU_BG is a GitHub Release URL that may 404; fetching it without checking r.ok
      // returned an HTML buffer that silently killed all three send fallbacks.
      const MENU_THUMB_URL = "https://www.upload.ee/image/19419994/file.jpg";
      const imageUrl = settings.menuBgUrl || MENU_BG;

      const vq = getVerifiedQuoted(settings);
      let menuThumb;
      try {
        const tr = await fetch(MENU_THUMB_URL);
        if (tr.ok) menuThumb = Buffer.from(await tr.arrayBuffer());
      } catch { menuThumb = undefined; }

      const menuCtx = {
        forwardingScore: 2025,
        isForwarded: true,
        ...(settings.channelId && settings.channelName ? {
          forwardedNewsletterMessageInfo: {
            newsletterJid: settings.channelId,
            serverMessageId: null,
            newsletterName: settings.channelName,
          },
        } : {}),
        externalAdReply: {
          title: botName,
          body: `${botName} Bot`,
          mediaType: 1,
          previewType: 0,
          thumbnail: menuThumb,
          thumbnailUrl: MENU_THUMB_URL,
          renderLargerThumbnail: false,
          sourceUrl: "t.me//DeathCore_Xr",
          mediaUrl: MENU_THUMB_URL,
        },
        quotedMessage: vq.message,
        participant: vq.key.participant,
        remoteJid: vq.key.remoteJid,
      };

      // Use image+caption — same reliable pattern as .tools/.fun/etc which all work.
      // NativeFlowCard (interactive messages) are silently dropped by many WA clients.
      try {
        if (menuThumb) {
          await sock.sendMessage(jid, { image: menuThumb, caption: menuCaption, contextInfo: menuCtx });
        } else {
          await sock.sendMessage(jid, { image: { url: imageUrl }, caption: menuCaption, contextInfo: menuCtx });
        }
      } catch {
        await reply(menuCaption);
      }
      break;
    }

    // ── .allmenu — full command list, NativeFlowCard + single_select ─────────────────
    case "allmenu": {
      await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
      try {
        const botName = settings.botName ?? "Yuzuki MD";

        // ── Time-based greeting (WIB = UTC+7) ──────────────────────────────
        const _wibHour = new Date(Date.now() + 7 * 3600000).getUTCHours();
        const _greeting =
          _wibHour >= 4  && _wibHour < 10 ? "Good Morning 🌅" :
          _wibHour >= 10 && _wibHour < 15 ? "Good Afternoon ☀️" :
          _wibHour >= 15 && _wibHour < 19 ? "Good Evening 🌇" :
          "Good Night 🌙";

        // ── Small-caps + bracket-box helpers ───────────────────────────────
        const _sc = (t) => {
          const m = {a:"ᴀ",b:"ʙ",c:"ᴄ",d:"ᴅ",e:"ᴇ",f:"ꜰ",g:"ɢ",h:"ʜ",i:"ɪ",j:"ᴊ",k:"ᴋ",l:"ʟ",m:"ᴍ",n:"ɴ",o:"ᴏ",p:"ᴘ",q:"ǫ",r:"ʀ",s:"s",t:"ᴛ",u:"ᴜ",v:"ᴠ",w:"ᴡ",x:"x",y:"ʏ",z:"ᴢ"};
          return t.toLowerCase().split("").map(c=>m[c]||c).join("");
        };
        const _box = (emoji, title, lines) => {
          let s = `╭─〔 ${emoji} \`${title}\`\n`;
          for (const l of lines) s += `┃ *${_sc(l)}*\n`;
          return s + `╰─⬣\n\n`;
        };

        // ── Permission symbols per command ──────────────────────────────────
        const _sym = (cmdName) => {
          const p = getPlugin(cmdName);
          if (!p?.config) return "";
          const s = [];
          if (p.config.isOwner)   s.push("Ⓞ");
          if (p.config.isPremium) s.push("ⓟ");
          if ((p.config.energi || 0) > 0 || getLimitCost(cmdName) > 0) s.push("Ⓛ");
          if (p.config.isGroupAdmin || p.config.isBotAdmin) s.push("Ⓐ");
          return s.length ? " " + s.join(" ") : "";
        };

        // ── Category config ─────────────────────────────────────────────────
        const _CAT_EMOJIS = {
          owner:"👑", main:"🏠", tools:"🛠️", canvas:"🎨",
          fun:"🎮", games:"🎯", game:"🎯", rpg:"⚔️", store:"🏪",
          search:"🔍", downloader:"📥", download:"📥", ai:"🤖",
          group:"👥", utility:"🔧",
        };
        const _CAT_ORDER = ["owner","main","tools","canvas","fun","games","game","rpg","store","search","downloader","download","ai","group","utility"];
        const _stats = getPluginStats();
        const _sortedCats = [..._stats.categories].sort((a, b) => {
          const ai = _CAT_ORDER.indexOf(a), bi = _CAT_ORDER.indexOf(b);
          return (ai===-1?999:ai) - (bi===-1?999:bi);
        });

        // ── Build body: short legend + per-category count summary ───────────
        // Full command list is too long for interactive messages (~4096 char limit).
        // Show a concise overview; user browses via the single_select dropdown.
        const _visibleCats = [];
        let _totalCmds = 0;
        for (const cat of _sortedCats) {
          if (cat === "owner" && !isOwner(senderJid, settings)) continue;
          const plugins = getPluginsByCategory(cat);
          if (!plugins.length) continue;
          _visibleCats.push(cat);
          _totalCmds += plugins.length;
        }

        const _catSummary = _visibleCats
          .map(cat => `${_CAT_EMOJIS[cat] || "📋"} ${cat.charAt(0).toUpperCase() + cat.slice(1)} — ${getPluginsByCategory(cat).length} cmds`)
          .join("\n");

        const txt =
          `✦ *${botName}* · ${_totalCmds} commands\n\n` +
          `*LEGEND*\n` +
          `Ⓞ Owner only  ⓟ Premium only  Ⓛ Needs limit  Ⓐ Admin only\n\n` +
          `*Categories*\n${_catSummary}\n\n` +
          `Tap *Browse Categories* below to explore.`;

        // ── Build single_select rows from categories ────────────────────────
        const _selectRows = _visibleCats.map(cat => ({
          id: `${prefix}menu ${cat}`,
          title: `${_CAT_EMOJIS[cat] || "📋"} ${cat.charAt(0).toUpperCase() + cat.slice(1)}`,
          description: `${getPluginsByCategory(cat).length} commands`,
        }));

        // ── Send via NativeFlowCard (proper OURIN MD 3 format) ──────────────
        const _thumb = await getThumb("menu");
        const card = new NativeFlowCard(sock);
        card
          .setBody(txt)
          .setFooter(`Type ${prefix}menu to return to the main menu`)
          .setOffer({ text: _greeting, copyCode: `Made by ${botName}`, durationMs: 1000000 })
          .addSelect("📂 Browse Categories", "Menu Categories", _selectRows);

        if (_thumb) card.setMedia({ image: _thumb });

        card.setContext({
          isForwarded: true,
          forwardingScore: 9,
          participant: "0@s.whatsapp.net",
          quotedMessage: { conversation: botName },
          mentionedJid: [senderJid],
          ...(settings.channelId && settings.channelName ? {
            forwardedNewsletterMessageInfo: {
              newsletterJid: settings.channelId,
              serverMessageId: 127,
              newsletterName: settings.channelName,
            },
          } : {}),
        });

        await card.send(jid);
        await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
      } catch (e) {
        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
        await reply(`❌ allmenu error: ${e.message}`);
      }
      break;
    }

    case "setmenuimg": {
      const url = args.join(" ").trim();
      if (!url) {
        await reply(`Usage: ${prefix}setmenuimg <image url>\nSend a direct image URL (jpg/png). Use ${prefix}setmenuimg clear to remove it.`);
        break;
      }
      if (url === "clear") {
        setSetting("menuBgUrl", "");
        await reply("Menu background image cleared.");
        break;
      }
      if (!/^https?:\/\/.+/i.test(url)) {
        await reply("Please provide a valid http/https URL.");
        break;
      }
      setSetting("menuBgUrl", url);
      await reply(`Menu background set! Send ${prefix}menu to preview it.`);
      break;
    }

    case "ping": {
      const t0 = Date.now();
      await replyChannel(card("🏓", "Pong", [
        ["Response", `${Date.now() - t0} ms`],
        ["Status",   "Online ✅"],
      ], "Yuzuki MD v2"));
      break;
    }

    case "alive": {
      const ms0 = Date.now() - startTime;
      const s0 = Math.floor(ms0 / 1000);
      const m0 = Math.floor(s0 / 60);
      const h0 = Math.floor(m0 / 60);
      const d0 = Math.floor(h0 / 24);
      const botName0 = settings.botName ?? "Yuzuki MD";
      const uptime0  = `${d0}d ${h0 % 24}h ${m0 % 60}m ${s0 % 60}s`;
      const text0 = card("🐋", botName0, [
        ["Status",   "Online ✅"],
        ["Prefix",   `\`${prefix}\``],
        ["Mode",     (settings.mode ?? "public").toUpperCase()],
        ["Uptime",   uptime0],
      ], "Yuzuki MD v2 • Powered by @whiskeysockets/baileys v6");
      const payload0 = await previewCard(text0, {
  title: botName0,
  body: `Online ✅  •  Uptime: ${uptime0}`,
  thumbUrl: "https://www.upload.ee/image/19419994/file.jpg",
  sourceUrl: "https://github.com/KyokaAizen665/Yuzuki-Md-V2",
  largeThumb: true
});
      const channelJid0 = settings.channelId ? `${settings.channelId}@newsletter` : null;
      if (channelJid0) {
        await sock.sendMessage(channelJid0, payload0);
      }
      await sock.sendMessage(jid, payload0, { quoted: msg });
      break;
    }

    case "uptime": {
      const ms = Date.now() - startTime;
      const s = Math.floor(ms / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      await replyChannel(card("⏱", "Uptime", [
        ["Running",  `${d}d ${h % 24}h ${m % 60}m ${s % 60}s`],
        ["Started",  new Date(startTime).toLocaleTimeString()],
      ], "Yuzuki MD v2"));
      break;
    }

    case "botowner":
    case "dev":
    case "creator":
    case "developer":
    case "own": {
const imageUrl = "https://www.upload.ee/image/19419994/file.jpg";

const media1 = await prepareWAMessageMedia(
{ image: { url: imageUrl } },
{ upload: sock.waUploadToServer }
);

const media2 = await prepareWAMessageMedia(
{ image: { url: imageUrl } },
{ upload: sock.waUploadToServer }
);

const media3 = await prepareWAMessageMedia(
{ image: { url: imageUrl } },
{ upload: sock.waUploadToServer }
);

const cards = [
{
header: {
...media1,
title: "👑 Aizen",
subtitle: "Owner & Developer",
hasMediaAttachment: true
},
body: {
text:
"*Hi 👋. Chat Aizen the developer who made me.*\n\n" +
"𝗡𝗮𝗺𝗲: Aizen\n" +
"𝗖𝗼𝗻𝘁𝗮𝗰𝘁: +233533416608"
},
nativeFlowMessage: {
buttons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "💬 Chat Owner",
url: "https://wa.me/233533416608",
merchant_url: "https://wa.me/233533416608"
})
}
]
}
},

{
  header: {
    ...media2,
    title: "📢 WhatsApp Channel",
    subtitle: "Official Updates",
    hasMediaAttachment: true
  },
  body: {
    text:
      `Stay updated with Yuzuki MD.\n\n` +
      `News, releases, fixes and future updates are posted here.`
  },
  nativeFlowMessage: {
    buttons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "📢 Join Channel",
          url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326",
          merchant_url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326"
        })
      }
    ]
  }
},

{
  header: {
    ...media3,
    title: "✈️ Telegram",
    subtitle: "Community",
    hasMediaAttachment: true
  },
  body: {
    text:
      `Join our Telegram community.\n\n` +
      `Get support, announcements and connect with other users.`
  },
  nativeFlowMessage: {
    buttons: [
      {
        name: "cta_url",
        buttonParamsJson: JSON.stringify({
          display_text: "✈️ Open Telegram",
          url: "https://t.me/DeathCore_Xr",
          merchant_url: "https://t.me/DeathCore_Xr"
        })
      }
    ]
  }
}

];

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
body: {
text: "👑 Yuzuki MD Owner Information"
},
carouselMessage: {
cards,
messageVersion: 1
}
}
}
}
},
{ quoted: msg }
);

await sock.relayMessage(
jid,
carouselMsg.message,
{ messageId: carouselMsg.key.id }
);

break;
}

    case "speed": {
      const t1 = Date.now();
      await replyChannel(card("📡", "Speed Test", [
        ["Latency", `${Date.now() - t1} ms`],
        ["Status",  "Online ✅"],
      ], "Yuzuki MD v2"));
      break;
    }

    case "vpsinfo": {
      const cpus = os.cpus();
      const mem  = os.totalmem();
      const free = os.freemem();
      const used = mem - free;
      await replyChannel(card("🖥", "System Info", [
        ["CPU",      `${cpus[0]?.model?.split(" ").slice(-2).join(" ") ?? "N/A"} ×${cpus.length}`],
        ["RAM",      `${Math.round(used/1024/1024)}MB / ${Math.round(mem/1024/1024)}MB`],
        ["Free RAM", `${Math.round(free/1024/1024)}MB`],
        null,
        ["OS",       `${os.platform()} ${os.arch()}`],
        ["Node",     process.version],
      ], "Yuzuki MD v2"));
      break;
    }

    case "totalcmds": {
      const cases = getCases();
      await replyChannel(card("📦", "Commands", [
        ["Custom",  `${cases.length} registered`],
      ], "Yuzuki MD v2"));
      break;
    }

    case "setchannelid": {
      const cid = args.join(" ").trim();
      if (!cid) { await reply(toast("info", "Usage", `${prefix}setchannelid <jid>  •  or  clear`)); break; }
      if (cid === "clear") { setSetting("channelId", ""); await reply(toast("ok", "Channel ID Cleared")); break; }
      setSetting("channelId", cid);
      await reply(toast("ok", "Channel ID Set", cid));
      break;
    }

    case "setchannelname": {
      const cname = args.join(" ").trim();
      if (!cname) { await reply(toast("info", "Usage", `${prefix}setchannelname <name>  •  or  clear`)); break; }
      if (cname === "clear") { setSetting("channelName", ""); await reply(toast("ok", "Channel Name Cleared")); break; }
      setSetting("channelName", cname);
      await reply(toast("ok", "Channel Name Set", cname));
      break;
    }

    case "setprefix": {
      const np = args[0];
      if (!np) { await reply(toast("info", "Usage", `${prefix}setprefix <new_prefix>`)); break; }
      setSetting("prefix", np);
      await reply(toast("ok", "Prefix Updated", `\`${np}\``));
      break;
    }

    case "setowner": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      if (!num) { await reply(toast("info", "Usage", `${prefix}setowner <phone_number>`)); break; }
      setSetting("ownerNumber", num);
      await reply(toast("ok", "Owner Number Set", num));
      break;
    }

    case "addowner": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      const name = args.slice(1).join(" ") || null;
      if (!num) { await reply(toast("info", "Usage", `${prefix}addowner <number> [name]`)); break; }
      const ok = addOwner(num, name);
      await reply(ok ? toast("ok", "Owner Added", `${num}${name ? `  (${name})` : ""}`) : toast("warn", "Already Exists", num));
      break;
    }

    case "delowner": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      if (!num) { await reply(toast("info", "Usage", `${prefix}delowner <number>`)); break; }
      const ok = removeOwner(num);
      await reply(ok ? toast("ok", "Owner Removed", num) : toast("err", "Not Found", num));
      break;
    }

    case "listowners": {
      const owners = getOwners();
      if (!owners.length) { await reply(toast("info", "No owners registered")); break; }
      await reply(listCard("👑", "Owners", owners.map(o => `${o.number}${o.name ? `  _(${o.name})_` : ""}`)));
      break;
    }

    case "setbotname": {
      const name = args.join(" ");
      if (!name) { await reply(toast("info", "Usage", `${prefix}setbotname <name>`)); break; }
      setSetting("botName", name);
      await reply(toast("ok", "Bot Name Updated", name));
      break;
    }

    case "public":
      setSetting("mode", "public");
      await reply(toggle("🌍", "Bot Mode", true, "Responds to everyone"));
      break;

    case "self":
      setSetting("mode", "self");
      await reply(toggle("🔒", "Bot Mode  •  Self", true, "Responds to owner only"));
      break;

    case "antidelete": {
      const cur = loadSettings().antidelete ?? false;
      setSetting("antidelete", !cur);
      await reply(toggle("🗑", "Anti-Delete", !cur));
      break;
    }

    case "antiviewonce":
    case "antivo": {
      const cur = loadSettings().antiviewonce ?? false;
      setSetting("antiviewonce", !cur);
      await reply(toggle("👁", "Anti-View-Once", !cur,
        !cur ? "View-once photos/videos/audios will be auto-revealed" : "View-once messages are hidden again"
      ));
      break;
    }

    case "gconly": {
      const sub = (args[0] ?? "").toLowerCase();
      const cur = loadSettings().gconly ?? false;
      if (sub === "on") {
        setSetting("gconly", true);
        await reply(toggle("👥", "Group-Only Mode", true, "Bot ignores DMs"));
      } else if (sub === "off") {
        setSetting("gconly", false);
        await reply(toggle("👥", "Group-Only Mode", false, "Bot responds everywhere"));
      } else {
        await reply(card("👥", "Group-Only Mode", [
          ["Current",  cur ? "✅ ON" : "🔴 OFF"],
          ["Turn on",  `\`${prefix}gconly on\``],
          ["Turn off", `\`${prefix}gconly off\``],
        ]));
      }
      break;
    }

    case "autoblock": {
      const cur = loadSettings().autoblock ?? false;
      setSetting("autoblock", !cur);
      await reply(toggle("🚫", "Auto-Block", !cur));
      break;
    }

    case "restart":
      await reply(progress("♻️", "Restarting Bot", "Back online in a few seconds..."));
      await stopBot();
      setTimeout(() => startBot().catch(console.error), 1500);
      break;

    case "clearsession":
      await reply(progress("🔑", "Clearing Session", "Will reconnect and show a new pairing code..."));
      await clearSession();
      break;

    case "push": {
      const commitMsg = args.join(" ") || "Update from Yuzuki MD";
      await reply(progress("🐋", "Pushing to GitHub", `"${commitMsg}"`));
      try {
        const result = await pushToGitHub(commitMsg);
        await reply(card("🐙", "Push Successful", [
          ["Files",   `${result.filesCount} uploaded`],
          ["Commit",  `\`${result.commitSha.slice(0, 7)}\``],
          ["Branch",  "main"],
          null,
          ["Link",    result.url],
        ], "github.com/KyokaAizen665/Yuzuki-Md-V2"));
      } catch (err) {
        await reply(toast("err", "Push Failed", err.message));
      }
      break;
    }

    case "update": {
      await reply(progress("🔄", "Fetching Latest Update", "Downloading from main branch..."));
      try {
        const result = await pullFromGitHub();
        await reply(card("✅", "Update Complete", [
          ["Files",   `${result.filesCount} updated`],
          ["Commit",  `\`${result.commitSha.slice(0, 7)}\``],
          ["Branch",  "main"],
          null,
          ["Link",    result.url],
        ], "Restarting to apply changes..."));
        await new Promise(r => setTimeout(r, 2000));
        await stopBot();
        setTimeout(() => startBot().catch(console.error), 1500);
      } catch (err) {
        await reply(toast("err", "Update Failed", err.message));
      }
      break;
    }

    case "changelog": {
      const count = Math.min(parseInt(args[0] ?? "5", 10) || 5, 10);
      await reply(progress("📋", "Fetching Changelog", `Last ${count} commits from main...`));
      try {
        const commits = await getChangelog(count);
        const rows = commits.map((c, i) =>
          `  ${i + 1}.  \`${c.sha}\`  ${c.date}\n      _${c.message}_`
        );
        await reply(
          `📋  *CHANGELOG*  •  _last ${commits.length} commits_\n` +
          `${"─".repeat(26)}\n` +
          rows.join("\n\n") +
          `\n${"─".repeat(26)}\n` +
          `_github.com/KyokaAizen665/Yuzuki-Md-V2_`
        );
      } catch (err) {
        await reply(toast("err", "Changelog Failed", err.message));
      }
      break;
    }

    // FIX #2: clearchat now has an actual handler
    case "clearchat": {
      try {
        await sock.chatModify({ clear: { before: { timestamp: Math.floor(Date.now() / 1000), id: "0" } } }, jid);
        await reply("Chat history cleared.");
      } catch {
        await reply("Failed to clear chat — make sure the bot has the required permissions.");
      }
      break;
    }

    case "addreseller": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      const name = args[1] || null;
      const quota = parseInt(args[2] ?? "10", 10);
      if (!num) { await reply(toast("info", "Usage", `${prefix}addreseller <number> [name] [quota]`)); break; }
      const ok = addReseller(num, name, quota);
      await reply(ok
        ? toast("ok", "Reseller Added", `${num}${name ? `  (${name})` : ""}  •  quota: ${quota}`)
        : toast("warn", "Already Exists", num));
      break;
    }

    case "delreseller": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      if (!num) { await reply(toast("info", "Usage", `${prefix}delreseller <number>`)); break; }
      const ok = removeReseller(num);
      await reply(ok ? toast("ok", "Reseller Removed", num) : toast("err", "Not Found", num));
      break;
    }

    case "listreseller": {
      const list = getResellers();
      if (!list.length) { await reply(toast("info", "No resellers registered")); break; }
      await reply(listCard("🤝", "Resellers", list.map(r =>
        `${r.number}${r.name ? `  _(${r.name})_` : ""}  •  ${r.usedQuota ?? 0}/${r.quota}`
      )));
      break;
    }

    case "resetreseller": {
      const num = args[0]?.replace(/[^0-9]/g, "");
      const newQuota = args[1] ? parseInt(args[1], 10) : null;
      if (!num) { await reply(toast("info", "Usage", `${prefix}resetreseller <number> [new_quota]`)); break; }
      const ok = resetReseller(num, newQuota);
      await reply(ok
        ? toast("ok", "Reseller Reset", `${num}${newQuota !== null ? `  •  new quota: ${newQuota}` : ""}`)
        : toast("err", "Not Found", num));
      break;
    }

    case "addkey": {
      const key = args[0];
      const desc = args.slice(1).join(" ") || null;
      if (!key) { await reply(toast("info", "Usage", `${prefix}addkey <key> [description]`)); break; }
      const ok = addKey(key, desc);
      await reply(ok
        ? toast("ok", "Key Added", `\`${key}\`${desc ? `  •  ${desc}` : ""}`)
        : toast("warn", "Already Exists", `\`${key}\``));
      break;
    }

    case "delkey": {
      const key = args[0];
      if (!key) { await reply(toast("info", "Usage", `${prefix}delkey <key>`)); break; }
      const ok = removeKey(key);
      await reply(ok ? toast("ok", "Key Removed", `\`${key}\``) : toast("err", "Not Found", `\`${key}\``));
      break;
    }

    case "listkey": {
      const keys = getKeys();
      if (!keys.length) { await reply(toast("info", "No keys registered")); break; }
      await reply(listCard("🔑", "Keys", keys.map(k =>
        `\`${k.key}\`${k.description ? `  •  ${k.description}` : ""}`
      )));
      break;
    }

    case "addcase": {
      const cmd = args[0]?.toLowerCase();
      const response = args.slice(1).join(" ");
      if (!cmd || !response) { await reply(`Usage: ${prefix}addcase <command> <response>`); break; }
      const ok = addCase(cmd, response);
      await reply(ok ? `Case *${cmd}* added.` : `Case *${cmd}* already exists.`);
      break;
    }

    case "delcase": {
      const cmd = args[0]?.toLowerCase();
      if (!cmd) { await reply(`Usage: ${prefix}delcase <command>`); break; }
      const ok = removeCase(cmd);
      await reply(ok ? `Case *${cmd}* removed.` : `Case *${cmd}* not found.`);
      break;
    }

    case "getcase": {
      const cmd = args[0]?.toLowerCase();
      if (!cmd) { await reply(`Usage: ${prefix}getcase <command>`); break; }
      const c = getCases().find((c) => c.command === cmd);
      await reply(c ? `Case: ${cmd}\nResponse: ${c.response}` : `Case *${cmd}* not found.`);
      break;
    }

    case "editcase": {
      const cmd = args[0]?.toLowerCase();
      const response = args.slice(1).join(" ");
      if (!cmd || !response) { await reply(`Usage: ${prefix}editcase <command> <new_response>`); break; }
      const ok = editCase(cmd, response);
      await reply(ok ? `Case *${cmd}* updated.` : `Case *${cmd}* not found.`);
      break;
    }


      // ── Fun ──────────────────────────────────────────────────────────────────

      case "8ball": {
        const RESPONSES = [
          "It is certain.","It is decidedly so.","Without a doubt.",
          "Yes, definitely.","You may rely on it.","As I see it, yes.",
          "Most likely.","Outlook good.","Yes.","Signs point to yes.",
          "Reply hazy, try again.","Ask again later.",
          "Better not tell you now.","Cannot predict now.",
          "Concentrate and ask again.","Don't count on it.",
          "My reply is no.","My sources say no.",
          "Outlook not so good.","Very doubtful.",
        ];
        const q = args.join(" ").trim();
        if (!q) { await reply(`Usage: ${prefix}8ball <question>`); break; }
        await replyChannel(`🎱 *${RESPONSES[Math.floor(Math.random() * RESPONSES.length)]}*`);
        break;
      }

      case "coinflip":
        await replyChannel(`🪙 *${Math.random() < 0.5 ? "Heads" : "Tails"}!*`);
        break;

      case "dice": {
        const sides = Math.max(2, parseInt(args[0] ?? "6", 10) || 6);
        await replyChannel(`🎲 Rolled *${Math.floor(Math.random() * sides) + 1}* (d${sides})`);
        break;
      }

      case "rps": {
        const CHOICES = ["rock","paper","scissors"];
        const user = (args[0] ?? "").toLowerCase();
        if (!CHOICES.includes(user)) { await reply(`Usage: ${prefix}rps <rock|paper|scissors>`); break; }
        const bot = CHOICES[Math.floor(Math.random() * 3)];
        const WIN = { rock:"scissors", paper:"rock", scissors:"paper" };
        const result = user === bot ? "It's a tie! 🤝" : WIN[user] === bot ? "You win! 🎉" : "Bot wins! 🤖";
        await replyChannel(`You: *${user}* | Bot: *${bot}*\n${result}`);
        break;
      }

      case "ship": {
        const raw = args.join(" ");
        const parts = raw.split(/\s+(?:and|&|\+|x|vs?)\s+/i);
        const a = parts[0]?.trim() || "Person A";
        const b = parts[1]?.trim() || "Person B";
        const pct = Math.floor(Math.random() * 101);
        const bar = "█".repeat(Math.floor(pct / 10)) + "░".repeat(10 - Math.floor(pct / 10));
        const heart = pct >= 80 ? "💕" : pct >= 50 ? "💛" : pct >= 30 ? "🤔" : "💔";
        await replyChannel(`${heart} *Ship Meter*\n${a} + ${b}\n[${bar}] *${pct}%*`);
        break;
      }

      case "truth": {
        const TRUTHS = [
          "What's the most embarrassing thing you've done?",
          "What's a secret you've never told anyone?",
          "What's the biggest lie you've ever told?",
          "Have you ever cheated on a test?",
          "What's your biggest fear?",
          "What's the most childish thing you still do?",
          "What's a bad habit you have?",
          "Who do you have a crush on?",
          "What's something you're ashamed of?",
          "What's the weirdest dream you've ever had?",
        ];
        await replyChannel(`🎯 *Truth:*\n${TRUTHS[Math.floor(Math.random() * TRUTHS.length)]}`);
        break;
      }

      case "dare": {
        const DARES = [
          "Send a voice note singing your favourite song.",
          "Text your crush 'hey' right now.",
          "Do 20 push-ups and send proof.",
          "Change your status to something embarrassing for 10 minutes.",
          "Send the last photo in your gallery.",
          "Speak in an accent for the next 5 minutes.",
          "Send a selfie with a funny face.",
          "Tell a joke — as badly as possible.",
          "Let someone in this chat send one message from your phone.",
          "Do your best impression of someone in this chat.",
        ];
        await replyChannel(`🎯 *Dare:*\n${DARES[Math.floor(Math.random() * DARES.length)]}`);
        break;
      }

      case "joke": {
        const JOKES = [
          "Why don't scientists trust atoms? Because they make up everything!",
          "I told my wife she was drawing her eyebrows too high. She looked surprised.",
          "Why don't eggs tell jokes? They'd crack each other up.",
          "I'm reading a book about anti-gravity. It's impossible to put down.",
          "Why did the scarecrow win an award? He was outstanding in his field.",
          "I would tell you a construction joke, but I'm still working on it.",
          "Why can't you give Elsa a balloon? Because she'll let it go.",
          "What do you call a fake noodle? An impasta.",
          "Why did the bicycle fall over? It was two-tired.",
          "Did you hear about the mathematician afraid of negative numbers? He'll stop at nothing to avoid them.",
        ];
        await replyChannel(`😂 ${JOKES[Math.floor(Math.random() * JOKES.length)]}`);
        break;
      }

      case "quote": {
        const QUOTES = [
          '"Be yourself; everyone else is already taken." — Oscar Wilde',
          '"Two things are infinite: the universe and human stupidity." — Einstein',
          '"The only way to do great work is to love what you do." — Steve Jobs',
          '"It does not matter how slowly you go as long as you do not stop." — Confucius',
          '"You miss 100% of the shots you dont take." — Wayne Gretzky',
          '"Get busy living or get busy dying." — Stephen King',
          '"Life is what happens when youre busy making other plans." — Lennon',
          '"The purpose of our lives is to be happy." — Dalai Lama',
          '"In the middle of difficulty lies opportunity." — Einstein',
          '"You only live once, but if you do it right, once is enough." — Mae West',
        ];
        await replyChannel(`💬 ${QUOTES[Math.floor(Math.random() * QUOTES.length)]}`);
        break;
      }

      case "fact": {
        const FACTS = [
          "Honey never spoils — 3000-year-old honey was found in Egyptian tombs.",
          "A group of flamingos is called a 'flamboyance'.",
          "Bananas are berries, but strawberries aren't.",
          "Octopuses have three hearts and blue blood.",
          "Sharks are older than trees.",
          "Cleopatra lived closer in time to the Moon landing than to the Great Pyramid.",
          "The shortest war in history lasted 38 minutes (Anglo-Zanzibar War, 1896).",
          "A day on Venus is longer than a year on Venus.",
          "The human nose can detect about 1 trillion different smells.",
          "A snail can sleep for up to 3 years.",
        ];
        await replyChannel(`🧠 *Fact:* ${FACTS[Math.floor(Math.random() * FACTS.length)]}`);
        break;
      }

      case "roast": {
        const ROASTS = [
          "You're the reason the gene pool needs a lifeguard.",
          "I'd agree with you but then we'd both be wrong.",
          "You have your whole life to be an idiot. Why not take today off?",
          "I'm not saying you're dumb, but you'd need a promotion to be an idiot.",
          "I'd explain it to you, but I left my crayons at home.",
          "Your secrets are always safe with me — I never listen to what you say.",
          "You're proof that even evolution makes mistakes.",
          "I've met some pretty dumb people in my time, then I met you.",
        ];
        const target = args.join(" ").trim() || "you";
        await replyChannel(`🔥 *For ${target}:*\n${ROASTS[Math.floor(Math.random() * ROASTS.length)]}`);
        break;
      }

      case "rizz":
      case "pickup": {
        const LINES = [
          "Are you a magician? Because whenever I look at you, everyone else disappears.",
          "Do you have a map? I keep getting lost in your eyes.",
          "Are you a parking ticket? You've got 'fine' written all over you.",
          "If you were a vegetable, you'd be a cute-cumber.",
          "Are you a bank loan? Because you've got my interest.",
          "Do you believe in love at first sight, or should I walk by again?",
          "Is your name Google? Because you have everything I've been searching for.",
          "Are you a camera? Every time I look at you, I smile.",
        ];
        await replyChannel(`😏 ${LINES[Math.floor(Math.random() * LINES.length)]}`);
        break;
      }

      case "horoscope": {
        const SIGNS = ["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
        const sign = (args[0] ?? "").toLowerCase();
        if (!sign || !SIGNS.includes(sign)) {
          await reply(`Usage: ${prefix}horoscope <sign>\nSigns: ${SIGNS.join(", ")}`);
          break;
        }
        const VIBES = [
          "✨ Great things are coming your way — stay open to opportunities.",
          "⚠️ Be cautious with big decisions today. Think before you act.",
          "💰 A financial opportunity may be closer than you think.",
          "❤️ Love is in the air — don't be afraid to express yourself.",
          "🧘 Focus on your wellbeing. Rest and recharge today.",
          "🌟 Your hard work is about to pay off. Keep going!",
        ];
        const cap = sign.charAt(0).toUpperCase() + sign.slice(1);
        await replyChannel(`♈ *${cap} Horoscope*\n${VIBES[Math.floor(Math.random() * VIBES.length)]}`);
        break;
      }

      case "guess": {
        await replyChannel(
          "🎯 *Number Guess Game*\n" +
          "I'm thinking of a number between 1 and 100.\n" +
          "Reply with your guess! (Game state is not persisted between restarts.)"
        );
        break;
      }

      // ── Tools ─────────────────────────────────────────────────────────────────

      case "calc":
      case "math": {
        const expr = args.join(" ").trim();
        if (!expr) { await reply(`Usage: ${prefix}calc <expression>\nExample: ${prefix}calc 2 + 2 * 10`); break; }
        try {
          if (!/^[\d\s\+\-\*\/\.\(\)\^%]+$/.test(expr)) throw new Error("Invalid characters");
          const result = Function(`"use strict"; return (${expr.replace(/\^/g, "**")})`)();
          if (typeof result !== "number" || !isFinite(result)) throw new Error("Bad result");
          await replyChannel(`🧮 *${expr} = ${result}*`);
        } catch {
          await reply(`❌ Invalid expression: \`${expr}\``);
        }
        break;
      }

      case "base64": {
  const sub = (args[0] ?? "").toLowerCase();
  const text = args.slice(1).join(" ");

  if ((sub !== "encode" && sub !== "decode") || !text) {
    await reply(`Usage:\n${prefix}base64 encode <text>\n${prefix}base64 decode <base64>`);
    break;
  }

  try {
    const result = sub === "encode"
      ? Buffer.from(text, "utf8").toString("base64")
      : Buffer.from(text, "base64").toString("utf8");

    const msgx = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            body: {
              text: `*Base64 ${sub}:*\n${result}`
            },
            footer: {
              text: settings.botName ?? "Yuzuki MD"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_copy",
                  buttonParamsJson: JSON.stringify({
                    display_text: "📋 Copy Result",
                    copy_code: result
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: msg });

    await sock.relayMessage(
      jid,
      msgx.message,
      { messageId: msgx.key.id }
    );

  } catch {
    await reply("❌ Failed. Make sure your input is valid.");
  }

  break;
}

      case "runtime": {
        const ms = Date.now() - startTime;
        const totalSec = Math.floor(ms / 1000);
        const d = Math.floor(totalSec / 86400);
        const h = Math.floor((totalSec % 86400) / 3600);
        const m = Math.floor((totalSec % 3600) / 60);
        const s = totalSec % 60;
        await replyChannel(`⏱️ *Runtime:* ${d}d ${h}h ${m}m ${s}s`);
        break;
      }

      case "about": {
  const msgx = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          body: {
            text:
              `*${settings.botName ?? "Yuzuki"}*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `A feature-rich WhatsApp bot built with Baileys.\n\n` +
              `🔑 *Prefix:* ${settings.prefix ?? "."}\n` +
              `👑 *Owner:* 233533416608\n` +
              `📦 *Platform:* Node.js + @whiskeysockets/baileys v6`
          },
          footer: {
            text: "Yuzuki MD"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "💻 GitHub Repo",
                  url: "https://github.com/KyokaAizen665/Yuzuki-Md-V2",
                  merchant_url: "https://github.com/KyokaAizen665/Yuzuki-Md-V2"
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: msg });

  await sock.relayMessage(
    jid,
    msgx.message,
    { messageId: msgx.key.id }
  );

  break;
}

      case "help": {
const mediaHeader = await prepareWAMessageMedia(
{
image: {
url: "https://www.upload.ee/image/19419994/file.jpg"
}
},
{
upload: sock.waUploadToServer
}
);

const msgx = generateWAMessageFromContent(jid, {
viewOnceMessage: {
message: {
messageContextInfo: {
deviceListMetadata: {},
deviceListMetadataVersion: 2,
},
interactiveMessage: {
header: {
hasMediaAttachment: true,
...mediaHeader
},
body: {
text:
`*${settings.botName ?? "Bot"} Help*\n` +
`━━━━━━━━━━━━━━━━━━━\n` +
`Use *${prefix}menu* to browse all commands.\n` +
`Use *${prefix}menu <category>* for a specific list.\n\n` +
`Categories:\n` +
`🤖 AI\n🎮 Game\n🛠 Tools\n🔍 Search\n👥 Group\n👑 Owner`
},
footer: {
text: "Yuzuki MD"
},
nativeFlowMessage: {
buttons: [
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "📢 WhatsApp Channel",
url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326",
merchant_url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326"
})
},
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "💬 Chat Owner",
url: "https://wa.me/233533416608",
merchant_url: "https://wa.me/233533416608"
})
},
{
name: "cta_url",
buttonParamsJson: JSON.stringify({
display_text: "✈️ Telegram",
url: "https://t.me/DeathCore_Xr",
merchant_url: "https://t.me/DeathCore_Xr"
})
}
]
}
}
}
}
}, { quoted: msg });

await sock.relayMessage(
jid,
msgx.message,
{ messageId: msgx.key.id }
);

break;
}

      case "donate": {
  const msgx = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          body: {
            text:
              `💖 *Support ${settings.botName ?? "this bot"}*\n` +
              `━━━━━━━━━━━━━━━━━━━\n` +
              `Enjoying the bot? Consider supporting the developer!\n` +
              `📞 Contact the owner: 233533416608\n\n` +
              `*Your support is appreciated 💛*`
          },
          footer: {
            text: settings.botName ?? "Yuzuki MD"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: "💬 Chat Owner",
                  url: "https://wa.me/233533416608",
                  merchant_url: "https://wa.me/233533416608"
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: msg });

  await sock.relayMessage(
    jid,
    msgx.message,
    { messageId: msgx.key.id }
  );

  break;
}

      // ── Group Management ──────────────────────────────────────────────────────

      case "tagall": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        try {
          const meta = await sock.groupMetadata(jid);
          const mentions = meta.participants.map(p => p.id);
          const text = `*\`Yuzuki MD\` tag all ${mentions.length} members*\n` + mentions.map(id => `@${id.split("@")[0]}`).join(" ");
          await sock.sendMessage(jid, { text, mentions }, { quoted: msg });
        } catch { await reply("❌ Failed to tag members — make sure I'm an admin."); }
        break;
      }

      case "groupinfo": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        try {
          const meta = await sock.groupMetadata(jid);
          const admins = meta.participants.filter(p => p.admin).length;
          await replyChannel(
            `👥 *Group Info*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `📛 *Name:* ${meta.subject}\n` +
            `👤 *Members:* ${meta.participants.length} (${admins} admin${admins !== 1 ? "s" : ""})\n` +
            `📝 *Description:* ${meta.desc ?? "None"}\n` +
            `📅 *Created:* ${meta.creation ? new Date(meta.creation * 1000).toLocaleDateString() : "Unknown"}`
          );
        } catch { await reply("❌ Failed to fetch group info."); }
        break;
      }

      case "link": {
  if (!jid?.endsWith("@g.us")) {
    await reply("This command only works in groups.");
    break;
  }

  try {
    const code = await sock.groupInviteCode(jid);
    const inviteLink = `https://chat.whatsapp.com/${code}`;

    const msgx = generateWAMessageFromContent(jid, {
      viewOnceMessage: {
        message: {
          messageContextInfo: {
            deviceListMetadata: {},
            deviceListMetadataVersion: 2,
          },
          interactiveMessage: {
            body: {
              text: `🔗 *Invite Link:*\n${inviteLink}`
            },
            footer: {
              text: settings.botName ?? "Yuzuki MD"
            },
            nativeFlowMessage: {
              buttons: [
                {
                  name: "cta_copy",
                  buttonParamsJson: JSON.stringify({
                    display_text: "📋 Copy Link",
                    copy_code: inviteLink
                  })
                }
              ]
            }
          }
        }
      }
    }, { quoted: msg });

    await sock.relayMessage(
      jid,
      msgx.message,
      { messageId: msgx.key.id }
    );

  } catch {
    await reply("❌ Failed to get invite link — make sure I'm an admin.");
  }

  break;
}

      case "revoke": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        try {
          await sock.groupRevokeInvite(jid);
          await reply(`✅ Invite link revoked. Use ${prefix}link to generate a new one.`);
        } catch { await reply("❌ Failed to revoke — make sure I'm an admin."); }
        break;
      }

      case "setdesc": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const desc = args.join(" ").trim();
        if (!desc) { await reply(`Usage: ${prefix}setdesc <description>`); break; }
        try {
          await sock.groupUpdateDescription(jid, desc);
          await reply("✅ Group description updated.");
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "setname": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const name = args.join(" ").trim();
        if (!name) { await reply(`Usage: ${prefix}setname <name>`); break; }
        try {
          await sock.groupUpdateSubject(jid, name);
          await reply("✅ Group name updated.");
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "mute": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        try {
          await sock.groupSettingUpdate(jid, "announcement");
          await reply("🔇 Group muted — only admins can send messages.");
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "unmute": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        try {
          await sock.groupSettingUpdate(jid, "not_announcement");
          await reply("🔊 Group unmuted — everyone can send messages.");
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "kick": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        if (!mentioned.length) { await reply(`Usage: ${prefix}kick @user`); break; }
        try {
          await sock.groupParticipantsUpdate(jid, mentioned, "remove");
          await reply(`✅ Removed ${mentioned.length} member(s).`);
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "add": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const num = args[0]?.replace(/[^0-9]/g, "");
        if (!num) { await reply(`Usage: ${prefix}add <number>`); break; }
        try {
          await sock.groupParticipantsUpdate(jid, [`${num}@s.whatsapp.net`], "add");
          await reply(`✅ Added *${num}* to the group.`);
        } catch { await reply("❌ Failed — they may not be on WhatsApp or I'm not an admin."); }
        break;
      }

      case "promote": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        if (!mentioned.length) { await reply(`Usage: ${prefix}promote @user`); break; }
        try {
          await sock.groupParticipantsUpdate(jid, mentioned, "promote");
          await reply(`✅ Promoted ${mentioned.length} member(s) to admin.`);
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      case "demote": {
        if (!jid?.endsWith("@g.us")) { await reply("This command only works in groups."); break; }
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        if (!mentioned.length) { await reply(`Usage: ${prefix}demote @user`); break; }
        try {
          await sock.groupParticipantsUpdate(jid, mentioned, "demote");
          await reply(`✅ Demoted ${mentioned.length} member(s) from admin.`);
        } catch { await reply("❌ Failed — make sure I'm an admin."); }
        break;
      }

      // ── Owner: block / unblock / broadcast ────────────────────────────────────

      case "block": {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const num = args[0]?.replace(/[^0-9]/g, "");
        const target = mentioned[0] ?? (num ? `${num}@s.whatsapp.net` : null);
        if (!target) { await reply(`Usage: ${prefix}block @user  or  ${prefix}block <number>`); break; }
        try {
          await sock.updateBlockStatus(target, "block");
          await reply(`✅ Blocked *${target.split("@")[0]}*.`);
        } catch { await reply("❌ Failed to block user."); }
        break;
      }

      case "unblock": {
        const num = args[0]?.replace(/[^0-9]/g, "");
        if (!num) { await reply(`Usage: ${prefix}unblock <number>`); break; }
        try {
          await sock.updateBlockStatus(`${num}@s.whatsapp.net`, "unblock");
          await reply(`✅ Unblocked *${num}*.`);
        } catch { await reply("❌ Failed to unblock user."); }
        break;
      }

      case "broadcast": {
        const text = args.join(" ").trim();
        if (!text) { await reply(`Usage: ${prefix}broadcast <message>`); break; }
        try {
          const chats = await sock.groupFetchAllParticipating();
          const groupJids = Object.keys(chats);
          let sent = 0;
          for (const g of groupJids) {
            try {
              await new NativeFlowCard(sock)
                .setTitle(`📣 ${settings.botName ?? "Yuzuki MD"} Broadcast`)
                .setBody(text)
                .setFooter(settings.botName ?? "Yuzuki MD")
                .addCtaUrl("📢 WA Channel", "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326")
                .addCtaUrl("💬 Chat Owner", `https://wa.me/${getOwners()[0]?.replace(/\D/g, "") || ""}`)
                .send(g);
              sent++;
              await new Promise(r => setTimeout(r, 1000));
            } catch {}
          }
          await reply(`✅ Broadcast sent to *${sent}* group(s).`);
        } catch (e) {
          await reply(`❌ Broadcast: ${e.message}`);
        }
        break;
      }

      // ── JPM — broadcast to individual users ───────────────────────────────
      case "jpm": {
        const text = args.join(" ").trim();
        if (!text) { await reply(`Usage: ${prefix}jpm <message>`); break; }
        await reply(`📤 Starting JPM broadcast...`);
        try {
          const { sent, failed, total } = await broadcastJPM(sock, text, {
            title: `📢 ${settings.botName ?? "Yuzuki MD"}`,
            footer: settings.botName ?? "Yuzuki MD",
          });
          await reply(
            `╭─〔 📤 *JPM COMPLETE* 〕\n│\n│  ✅ Sent:   *${sent}*\n│  ❌ Failed: *${failed}*\n│  👥 Total:  *${total}*\n│\n╰───────────────`
          );
        } catch (e) {
          await reply(`❌ JPM failed: ${e.message}`);
        }
        break;
      }

      // ── Announcement card (externalAdReply + newsletter style) ────────────
      case "announce": {
        const text = args.join(" ").trim();
        if (!text) { await reply(`Usage: ${prefix}announce <message>`); break; }
        try {
          await sendAnnouncementCard(sock, jid, {
            title: settings.botName ?? "Yuzuki MD",
            body:  text,
            footer: settings.botName ?? "Yuzuki MD",
            ctaLabel: "View More",
            ctaUrl: "https://github.com/KyokaAizen665/Yuzuki-Md-V2",
          });
        } catch (e) {
          await reply(`❌ Announce failed: ${e.message}`);
        }
        break;
      }

      // ── Forwarded-style message ───────────────────────────────────────────
      case "forward": {
        const text = args.join(" ").trim();
        if (!text) { await reply(`Usage: ${prefix}forward <message>`); break; }
        await sendForwarded(sock, jid, text, { score: 999, quoted: msg });
        break;
      }

      // ── Fake Contact Card ──────────────────────────────────────────────────
      case "fakecontact":
      case "vcard":
      case "fakevc": {
        const parts = text.split("|").map(s => s.trim());
        const name  = parts[0]; const number = parts[1]; const org = parts[2] ?? "";
        if (!name || !number) { await reply(`Usage: ${prefix}fakecontact <name> | <number> [| <org>]\nExample: ${prefix}fakecontact Elon Musk | 14085551234 | Tesla`); break; }
        const cleanNum = number.replace(/[^0-9]/g, "");
        if (cleanNum.length < 5) { await reply("❌ Invalid number. Use international format e.g. 14085551234"); break; }
        await sendFakeContact(sock, jid, { displayName: name, number: cleanNum, org, verified: name.startsWith("✅") }, { quoted: msg });
        break;
      }

      // ── Fake Reply / Quote ─────────────────────────────────────────────────
      case "fakereply":
      case "fq":
      case "fakequote": {
        const parts = text.split("|").map(s => s.trim());
        const quotedText = parts[0]; const replyText = parts[1]; const senderName = parts[2] ?? "User";
        if (!quotedText || !replyText) { await reply(`Usage: ${prefix}fakereply <quoted> | <reply> [| <sender>]`); break; }
        await sendWithFakeQuote(sock, jid, replyText, { quotedName: senderName, quotedText });
        break;
      }

      // ── Poll Creator ───────────────────────────────────────────────────────
      case "poll":
      case "vote": {
        const parts = text.split("|").map(s => s.trim());
        const question = parts[0]; const options = parts.slice(1).filter(Boolean);
        if (!question) { await reply(`Usage: ${prefix}poll <question> | opt1 | opt2 | ...`); break; }
        if (options.length < 2) { await reply("❌ Need at least 2 options separated by `|`"); break; }
        if (options.length > 12) { await reply("❌ Maximum 12 options per poll."); break; }
        try {
          await sendPoll(sock, jid, { question, options }, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) { await reply(`❌ Poll failed: ${e.message}`); }
        break;
      }

      // ── Fake Location ──────────────────────────────────────────────────────
      case "fakeloc":
      case "location":
      case "sendloc": {
        const raw = text.trim().toLowerCase();
        if (!raw) {
          await reply(`📍 *Fake Location*\n\nUsage:\n• \`${prefix}fakeloc <city>\`\n• \`${prefix}fakeloc <lat>,<lng> | name\`\n\nPresets: ${Object.keys(FAKE_LOCATIONS).join(", ")}`);
          break;
        }
        const [locPart, locName] = raw.split("|").map(s => s.trim());
        let loc;
        if (FAKE_LOCATIONS[locPart]) {
          loc = FAKE_LOCATIONS[locPart];
        } else if (locPart.includes(",")) {
          const [lat, lng] = locPart.split(",").map(Number);
          if (isNaN(lat) || isNaN(lng)) { await reply("❌ Invalid coords. Use: lat,lng"); break; }
          loc = { lat, lng, name: locName ?? "Custom Location" };
        } else { await reply(`❌ Unknown city. Available: ${Object.keys(FAKE_LOCATIONS).join(", ")}`); break; }
        try {
          await sendLocation(sock, jid, loc, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "📍", key: msg.key } });
        } catch (e) { await reply(`❌ Location failed: ${e.message}`); }
        break;
      }

      // ── Typing / Recording indicator ──────────────────────────────────────
      case "type":
      case "typing": {
        if (!text) { await reply(`Usage: ${prefix}type <message>`); break; }
        await sendWithTyping(sock, jid, text, { delay: 2000 });
        break;
      }
      case "record":
      case "recording": {
        if (!text) { await reply(`Usage: ${prefix}record <message>`); break; }
        await sendWithRecording(sock, jid, text, { delay: 2000 });
        break;
      }

      // ── Disappearing Message ───────────────────────────────────────────────
      case "disappear":
      case "ephemeral": {
        const parts = text.split("|").map(s => s.trim());
        const epText = parts[0]; const dur = ["24h","7d","90d"].includes(parts[1]) ? parts[1] : "7d";
        if (!epText) { await reply(`Usage: ${prefix}disappear <message> [| 24h|7d|90d]`); break; }
        try {
          await sendEphemeral(sock, jid, epText, { duration: dur, quoted: msg });
          await sock.sendMessage(jid, { react: { text: "💨", key: msg.key } });
        } catch (e) { await reply(`❌ Failed: ${e.message}`); }
        break;
      }

      // ── Carousel ───────────────────────────────────────────────────────────
      case "carousel":
      case "swipe": {
        const [urlPart, header] = text.split("::").map(s => s.trim());
        const urls = (urlPart || "").split("|").map(u => u.trim()).filter(Boolean);
        if (!urls.length) { await reply(`Usage: ${prefix}carousel <url1> | <url2> [:: header]`); break; }
        if (urls.length > 6) { await reply("❌ Maximum 6 images per carousel."); break; }
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        try {
          await sendCarousel(sock, jid, {
            headerText: header ?? `🖼️ ${urls.length} images`,
            items: urls.map((url, i) => ({ imageUrl: url, title: `Image ${i+1}`, body: `${i+1} of ${urls.length}` })),
          }, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          await reply(`❌ Carousel failed: ${e.message}`);
        }
        break;
      }

      // ── Voice Note (PTT) ───────────────────────────────────────────────────
      case "ptt":
      case "voicenote": {
        const audioUrl = text.trim();
        if (!audioUrl) { await reply(`Usage: ${prefix}ptt <audio URL>`); break; }
        try { new URL(audioUrl); } catch { await reply("❌ Invalid URL."); break; }
        await sock.sendMessage(jid, { react: { text: "🎙️", key: msg.key } });
        try {
          await sendVoiceNote(sock, jid, audioUrl, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) { await reply(`❌ Voice note failed: ${e.message}`); }
        break;
      }

      // ── GIF-style Video ────────────────────────────────────────────────────
      case "gif":
      case "sendgif": {
        const gifUrl = text.trim();
        if (!gifUrl) { await reply(`Usage: ${prefix}gif <video URL>  — sends video as auto-playing GIF`); break; }
        try { new URL(gifUrl); } catch { await reply("❌ Invalid URL."); break; }
        await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
        try {
          await sendGif(sock, jid, gifUrl, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) { await reply(`❌ GIF failed: ${e.message}`); }
        break;
      }

      // ── Profile ───────────────────────────────────────────────────────────────

      case "pp": {
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const target = mentioned[0] ?? senderJid;
        try {
          // Use enhanced PP system: cached fetch with auto-fallback
          const { getProfilePicture, getProfileBuffer, makeRoundAvatar } = await import("./lib/profile-picture.js");
          const ppBuf    = await getProfileBuffer(sock, target);
          const roundBuf = ppBuf ? await makeRoundAvatar(ppBuf, 400).catch(() => ppBuf) : null;
          const name     = target.split("@")[0].split(":")[0];
          if (roundBuf) {
            await sock.sendMessage(jid, {
              image: roundBuf,
              caption: `📸 *Profile picture*\n👤 @${name}`,
              mentions: [target],
            }, { quoted: msg });
          } else {
            const ppUrl = await getProfilePicture(sock, target);
            await sock.sendMessage(jid, {
              image: { url: ppUrl },
              caption: `📸 Profile picture of @${name}`,
              mentions: [target],
            }, { quoted: msg });
          }
        } catch { await reply("❌ No profile picture found or it's private."); }
        break;
      }

      case "ppround": {
        // Round avatar with border — standalone command
        const mentioned2 = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const target2 = mentioned2[0] ?? senderJid;
        try {
          const { getProfileBuffer, makeRoundAvatar } = await import("./lib/profile-picture.js");
          const buf2   = await getProfileBuffer(sock, target2);
          if (!buf2) return reply("❌ Could not fetch profile picture.");
          const round2 = await makeRoundAvatar(buf2, 512);
          await sock.sendMessage(jid, {
            image: round2,
            caption: `🖼️ *Round Avatar* — @${target2.split("@")[0]}`,
            mentions: [target2],
          }, { quoted: msg });
        } catch { await reply("❌ Failed to process profile picture."); }
        break;
      }

      // ── Profile / RPG ─────────────────────────────────────────────────────────

      case "reg": {
        initUserDB(sender, pushname);
        const db0 = loadDB();
        const u0 = db0.users[sender];
        if (u0.registered) {
          await reply(`✅ You are already registered, *${u0.name}*!\n\nUse *.rank* to see your profile.`);
          break;
        }
        u0.registered = true;
        u0.money = (u0.money || 0) + 100;
        if (!Array.isArray(u0.badges)) u0.badges = [];
        if (!u0.badges.includes("🌱 Newcomer")) u0.badges.push("🌱 Newcomer");
        if (!u0.bio) u0.bio = "";
        saveDB(db0);
        await replyWithThumb("reg",
          `🎉 *Welcome, ${pushname}!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `✅ Profile registered!\n` +
          `💰 Welcome bonus: *+100 coins*\n` +
          `🌱 Badge earned: *Newcomer*\n\n` +
          `Use *.rank* to see your profile\nUse *.setbio* to set your bio`
        );
        break;
      }

      case "rank":
      case "xp": {
        initUserDB(sender, pushname);
        const dbR = loadDB();
        const uR = dbR.users[sender];
        if (!uR.registered) {
          await reply(`❌ You are not registered yet!\n\nUse *${prefix}reg* to create your profile.`);
          break;
        }
        const lvlR = uR.level || 0;
        const expR = uR.exp || 0;
        const xpNeedR = (lvlR + 1) * 100;
        const filledR = Math.round((expR / xpNeedR) * 10);
        const barR = "█".repeat(filledR) + "░".repeat(10 - filledR);
        const rankPos = getRankPosition(sender) ?? "—";
        const badgesR = (uR.badges || []).join(" ") || "None";
        const bioR = uR.bio || "No bio set.";
        await replyWithThumb("rank",
          `👤 *${uR.name || pushname}*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `🏆 Rank: *#${rankPos}*\n` +
          `⭐ Level: *${lvlR}*\n` +
          `✨ XP: *${expR}/${xpNeedR}*\n` +
          `[${barR}]\n` +
          `💰 Coins: *${uR.money || 0}*\n` +
          `🏦 Bank: *${uR.bank || 0}*\n` +
          `❤️ HP: *${uR.health || 100}*\n` +
          `💬 Messages: *${uR.msgCount || 0}*\n` +
          `🎖 Badges: ${badgesR}\n` +
          `📝 Bio: _${bioR}_`
        );
        break;
      }

      case "leaderboard": {
        const lbList = getLeaderboard(10);
        if (!lbList.length) {
          await reply(`No registered users yet!\n\nUse *${prefix}reg* to create your profile.`);
          break;
        }
        const medals = ["🥇","🥈","🥉"];
        const rows = lbList.map((u, i) => {
          const icon = medals[i] ?? `${i + 1}.`;
          return `${icon} *${u.name || u.jid.split("@")[0]}* — Lv.${u.level || 0} (${u.exp || 0} XP)`;
        }).join("\n");
        await replyWithThumb("leaderboard", `🏆 *Top Players*\n━━━━━━━━━━━━━━━━━━━\n${rows}`);
        break;
      }

      case "bio": {
        initUserDB(sender, pushname);
        const dbBio = loadDB();
        const uBio = dbBio.users[sender];
        await reply(
          `📝 *Bio — ${uBio.name || pushname}*\n\n` +
          (uBio.bio || `No bio set yet.\nUse *${prefix}setbio <text>* to set one.`)
        );
        break;
      }

      case "setbio": {
        if (!text) { await reply(`Usage: ${prefix}setbio <your bio>`); break; }
        if (text.length > 150) { await reply("❌ Bio is too long (max 150 characters)."); break; }
        initUserDB(sender, pushname);
        const dbSb = loadDB();
        dbSb.users[sender].bio = text;
        saveDB(dbSb);
        await reply(`✅ Bio updated!\n\n📝 _${text}_`);
        break;
      }

      case "badge": {
        initUserDB(sender, pushname);
        const dbBad = loadDB();
        const uBad = dbBad.users[sender];
        const badgeList = uBad.badges || [];
        if (!badgeList.length) {
          await reply(`You have no badges yet!\n\n🎖 Keep using the bot to earn badges.\nUse *${prefix}reg* to register if you haven't.`);
          break;
        }
        await reply(
          `🎖 *Badges — ${uBad.name || pushname}*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          badgeList.join("\n") +
          `\n\n_Total: ${badgeList.length} badge(s)_`
        );
        break;
      }

      case "gift": {
        const giftMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const giftTarget = giftMentioned[0];
        const giftAmount = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!giftTarget) { await reply(`Usage: ${prefix}gift @user <amount>`); break; }
        if (!giftAmount || giftAmount <= 0) { await reply(`❌ Enter a valid amount.\nUsage: ${prefix}gift @user 100`); break; }
        initUserDB(sender, pushname);
        initUserDB(giftTarget, "User");
        const dbGift = loadDB();
        const giver = dbGift.users[sender];
        const receiver = dbGift.users[giftTarget];
        if ((giver.money || 0) < giftAmount) {
          await reply(`❌ Insufficient coins.\n💰 You have: *${giver.money || 0}* coins`);
          break;
        }
        giver.money -= giftAmount;
        receiver.money = (receiver.money || 0) + giftAmount;
        saveDB(dbGift);
        await replyWithThumb("gift",
          `🎁 *Gift Sent!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `👤 From: *${pushname}*\n` +
          `👤 To: @${giftTarget.split("@")[0].split(":")[0]}\n` +
          `💰 Amount: *${giftAmount} coins*\n` +
          `💳 Your balance: *${giver.money} coins*`
        );
        break;
      }

      case "redeem": {
        const keyInput = args[0]?.trim();
        if (!keyInput) { await reply(`Usage: ${prefix}redeem <key>`); break; }
        const allKeys = getKeys();
        const foundKey = allKeys.find(k => k.key === keyInput && k.active !== false);
        if (!foundKey) { await reply("❌ Invalid or inactive key."); break; }
        initUserDB(sender, pushname);
        const dbRed = loadDB();
        const uRed = dbRed.users[sender];
        if (!Array.isArray(uRed.redeemedKeys)) uRed.redeemedKeys = [];
        if (uRed.redeemedKeys.includes(keyInput)) {
          await reply("❌ You have already redeemed this key.");
          break;
        }
        uRed.redeemedKeys.push(keyInput);
        uRed.money = (uRed.money || 0) + 500;
        saveDB(dbRed);
        await replyWithThumb("redeem",
          `✅ *Key Redeemed!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `🔑 Key: \`${keyInput}\`\n` +
          `💰 Reward: *+500 coins*\n` +
          `💳 Balance: *${uRed.money} coins*`
        );
        break;
      }

      case "setpp": {
        if (!isOwner(senderJid, settings)) { await reply("❌ Owner only."); break; }
        try {
          let imgBuf;
          const quotedCtx = msg.message?.extendedTextMessage?.contextInfo;
          if (quotedCtx?.quotedMessage?.imageMessage) {
            const fakeMsg = {
              message: quotedCtx.quotedMessage,
              key: { remoteJid: jid, id: quotedCtx.stanzaId, fromMe: false, participant: quotedCtx.participant },
            };
            imgBuf = await downloadMediaMessage(fakeMsg, "buffer", {});
          } else if (msg.message?.imageMessage) {
            imgBuf = await downloadMediaMessage(msg, "buffer", {});
          }
          if (!imgBuf) { await reply("❌ Send or quote an image to set as the bot's profile picture."); break; }
          await sock.updateProfilePicture(sock.user.id, imgBuf);
          await reply("✅ Bot profile picture updated!");
        } catch (e) {
          await reply(`❌ Failed to update profile picture: ${e.message}`);
        }
        break;
      }

      // ── Profile Engine ───────────────────────────────────────────────────────

      case "daily": {
        initUserDB(sender, pushname);
        const dbD = loadDB();
        const uD = dbD.users[sender];
        if (!uD.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        const dailyNow = Date.now();
        const dailyCool = 24 * 60 * 60 * 1000;
        if (dailyNow - (uD.lastdaily || 0) < dailyCool) {
          const rem = dailyCool - (dailyNow - (uD.lastdaily || 0));
          const h = Math.floor(rem / 3600000);
          const m = Math.floor((rem % 3600000) / 60000);
          await reply(`⏳ Daily already claimed!\n\n🕐 Come back in *${h}h ${m}m*.`);
          break;
        }
        const dailyCoins = Math.floor(Math.random() * 101) + 50;
        uD.lastdaily = dailyNow;
        uD.money = (uD.money || 0) + dailyCoins;
        uD.exp = (uD.exp || 0) + 10;
        while (uD.exp >= (uD.level + 1) * 100) { uD.exp -= (uD.level + 1) * 100; uD.level++; }
        saveDB(dbD);
        await replyWithThumb("daily",
          `🎁 *Daily Reward Claimed!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `💰 Coins: *+${dailyCoins}*\n` +
          `✨ XP: *+10*\n` +
          `💳 Balance: *${uD.money} coins*\n\n` +
          `_Come back in 24 hours for more!_`
        );
        break;
      }

      case "bal":
      case "balance": {
        initUserDB(sender, pushname);
        const dbBal = loadDB();
        const uBal = dbBal.users[sender];
        if (!uBal.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        await replyWithThumb("bal",
          `💳 *Balance — ${uBal.name || pushname}*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `👛 Wallet: *${uBal.money || 0} coins*\n` +
          `🏦 Bank:   *${uBal.bank || 0} coins*\n` +
          `💎 Total:  *${(uBal.money || 0) + (uBal.bank || 0)} coins*`
        );
        break;
      }

      case "deposit": {
        const depAmt = parseInt(args[0]);
        if (!depAmt || depAmt <= 0) { await reply(`Usage: ${prefix}deposit <amount>`); break; }
        initUserDB(sender, pushname);
        const dbDep = loadDB();
        const uDep = dbDep.users[sender];
        if (!uDep.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        if ((uDep.money || 0) < depAmt) { await reply(`❌ Not enough coins.\n💳 Wallet: *${uDep.money || 0}*`); break; }
        uDep.money -= depAmt;
        uDep.bank = (uDep.bank || 0) + depAmt;
        saveDB(dbDep);
        await replyWithThumb("deposit",
          `🏦 *Deposit Successful*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `📥 Deposited: *${depAmt} coins*\n` +
          `👛 Wallet: *${uDep.money}*\n` +
          `🏦 Bank: *${uDep.bank}*`
        );
        break;
      }

      case "withdraw": {
        const wdAmt = parseInt(args[0]);
        if (!wdAmt || wdAmt <= 0) { await reply(`Usage: ${prefix}withdraw <amount>`); break; }
        initUserDB(sender, pushname);
        const dbWd = loadDB();
        const uWd = dbWd.users[sender];
        if (!uWd.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        if ((uWd.bank || 0) < wdAmt) { await reply(`❌ Not enough in bank.\n🏦 Bank: *${uWd.bank || 0}*`); break; }
        uWd.bank -= wdAmt;
        uWd.money = (uWd.money || 0) + wdAmt;
        saveDB(dbWd);
        await replyWithThumb("withdraw",
          `🏦 *Withdrawal Successful*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `📤 Withdrawn: *${wdAmt} coins*\n` +
          `👛 Wallet: *${uWd.money}*\n` +
          `🏦 Bank: *${uWd.bank}*`
        );
        break;
      }

      case "transfer": {
        const trMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const trTarget = trMentioned[0];
        const trAmt = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!trTarget) { await reply(`Usage: ${prefix}transfer @user <amount>`); break; }
        if (!trAmt || trAmt <= 0) { await reply(`❌ Enter a valid amount.`); break; }
        if (trTarget === sender) { await reply(`❌ You can't transfer to yourself.`); break; }
        initUserDB(sender, pushname);
        initUserDB(trTarget, "User");
        const dbTr = loadDB();
        const uTrFrom = dbTr.users[sender];
        const uTrTo = dbTr.users[trTarget];
        if (!uTrFrom.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        if ((uTrFrom.money || 0) < trAmt) { await reply(`❌ Not enough coins.\n💳 Wallet: *${uTrFrom.money || 0}*`); break; }
        uTrFrom.money -= trAmt;
        uTrTo.money = (uTrTo.money || 0) + trAmt;
        saveDB(dbTr);
        await sock.sendMessage(jid, {
          image: await getThumb("transfer"),
          caption:
            `💸 *Transfer Sent!*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `👤 To: @${trTarget.split("@")[0].split(":")[0]}\n` +
            `💰 Amount: *${trAmt} coins*\n` +
            `💳 Your wallet: *${uTrFrom.money}*`,
          mentions: [trTarget],
        }, { quoted: channelQuote || msg });
        break;
      }

      case "mine": {
        initUserDB(sender, pushname);
        const dbMine = loadDB();
        const uMine = dbMine.users[sender];
        if (!uMine.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        const mineNow = Date.now();
        const mineCool = 4 * 60 * 60 * 1000;
        if (mineNow - (uMine.lastmining || 0) < mineCool) {
          const rem = mineCool - (mineNow - (uMine.lastmining || 0));
          const h = Math.floor(rem / 3600000);
          const m = Math.floor((rem % 3600000) / 60000);
          await reply(`⛏️ Already mined!\n\n🕐 Next mine in *${h}h ${m}m*.`);
          break;
        }
        const mineCoins = Math.floor(Math.random() * 61) + 20;
        const mineXP = Math.floor(Math.random() * 11) + 5;
        uMine.lastmining = mineNow;
        uMine.money = (uMine.money || 0) + mineCoins;
        uMine.exp = (uMine.exp || 0) + mineXP;
        while (uMine.exp >= (uMine.level + 1) * 100) { uMine.exp -= (uMine.level + 1) * 100; uMine.level++; }
        saveDB(dbMine);
        const ORES = ["⛏️ Iron","🪨 Stone","💎 Diamond","🥇 Gold","🔮 Crystal","🌑 Coal"];
        const ore = ORES[Math.floor(Math.random() * ORES.length)];
        await replyWithThumb("mine",
          `⛏️ *Mining Complete!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `🪨 Found: *${ore}*\n` +
          `💰 Coins: *+${mineCoins}*\n` +
          `✨ XP: *+${mineXP}*\n` +
          `💳 Balance: *${uMine.money}*\n\n` +
          `_Next mine available in 4 hours._`
        );
        break;
      }

      case "work": {
        initUserDB(sender, pushname);
        const dbWork = loadDB();
        const uWork = dbWork.users[sender];
        if (!uWork.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        const workNow = Date.now();
        const workCool = 60 * 60 * 1000;
        if (workNow - (uWork.lastwork || 0) < workCool) {
          const rem = workCool - (workNow - (uWork.lastwork || 0));
          const m = Math.floor(rem / 60000);
          await reply(`💼 Already worked!\n\n🕐 Next shift in *${m} min*.`);
          break;
        }
        const workCoins = Math.floor(Math.random() * 31) + 10;
        const workXP = Math.floor(Math.random() * 6) + 3;
        uWork.lastwork = workNow;
        uWork.money = (uWork.money || 0) + workCoins;
        uWork.exp = (uWork.exp || 0) + workXP;
        while (uWork.exp >= (uWork.level + 1) * 100) { uWork.exp -= (uWork.level + 1) * 100; uWork.level++; }
        saveDB(dbWork);
        const JOBS = ["🧹 cleaned offices","👨‍🍳 cooked meals","📦 delivered packages","💻 fixed bugs","🎨 designed a logo","🔧 repaired equipment","📚 tutored students","🚗 drove a taxi"];
        const job = JOBS[Math.floor(Math.random() * JOBS.length)];
        await replyWithThumb("work",
          `💼 *Work Complete!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `🏷️ You ${job}\n` +
          `💰 Earned: *${workCoins} coins*\n` +
          `✨ XP: *+${workXP}*\n` +
          `💳 Balance: *${uWork.money}*\n\n` +
          `_Next shift in 1 hour._`
        );
        break;
      }

      case "heal": {
        initUserDB(sender, pushname);
        const dbHeal = loadDB();
        const uHeal = dbHeal.users[sender];
        if (!uHeal.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        if ((uHeal.health || 100) >= 100) { await reply(`❤️ Already at full health *(100 HP)*!`); break; }
        const healCost = 50;
        if ((uHeal.money || 0) < healCost) {
          await reply(`❌ Not enough coins.\n💰 Healing costs *${healCost} coins*.\n💳 You have: *${uHeal.money || 0}*`);
          break;
        }
        const healed = Math.min(50, 100 - (uHeal.health || 0));
        uHeal.money -= healCost;
        uHeal.health = Math.min(100, (uHeal.health || 0) + healed);
        saveDB(dbHeal);
        await replyWithThumb("heal",
          `❤️ *Healed!*\n` +
          `━━━━━━━━━━━━━━━━━━━\n` +
          `💊 HP restored: *+${healed}*\n` +
          `❤️ HP: *${uHeal.health}/100*\n` +
          `💰 Cost: *-${healCost} coins*\n` +
          `💳 Balance: *${uHeal.money}*`
        );
        break;
      }

      case "dungeon": {
        initUserDB(sender, pushname);
        const dbDun = loadDB();
        const uDun = dbDun.users[sender];
        if (!uDun.registered) { await reply(`❌ Register first with *${prefix}reg*.`); break; }
        const dunNow = Date.now();
        const dunCool = 6 * 60 * 60 * 1000;
        if (dunNow - (uDun.lastdungeon || 0) < dunCool) {
          const rem = dunCool - (dunNow - (uDun.lastdungeon || 0));
          const h = Math.floor(rem / 3600000);
          const m = Math.floor((rem % 3600000) / 60000);
          await reply(`⚔️ Still recovering!\n\n🕐 Next dungeon in *${h}h ${m}m*.`);
          break;
        }
        const ENEMIES = [
          { name: "🐺 Wolf",      dmg: 15, reward: 40,  xp: 20 },
          { name: "🧟 Zombie",    dmg: 20, reward: 60,  xp: 30 },
          { name: "🐉 Dragon",    dmg: 35, reward: 100, xp: 50 },
          { name: "🧙 Dark Mage", dmg: 25, reward: 80,  xp: 40 },
          { name: "💀 Skeleton",  dmg: 18, reward: 50,  xp: 25 },
        ];
        const enemy = ENEMIES[Math.floor(Math.random() * ENEMIES.length)];
        const win = (uDun.health || 100) > enemy.dmg || Math.random() > 0.35;
        uDun.lastdungeon = dunNow;
        if (win) {
          uDun.money = (uDun.money || 0) + enemy.reward;
          uDun.exp = (uDun.exp || 0) + enemy.xp;
          while (uDun.exp >= (uDun.level + 1) * 100) { uDun.exp -= (uDun.level + 1) * 100; uDun.level++; }
          uDun.health = Math.max(1, (uDun.health || 100) - Math.floor(enemy.dmg / 2));
          saveDB(dbDun);
          await replyWithThumb("dungeon",
            `⚔️ *Victory!*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `👹 Defeated: *${enemy.name}*\n` +
            `💰 Reward: *+${enemy.reward} coins*\n` +
            `✨ XP: *+${enemy.xp}*\n` +
            `❤️ HP: *${uDun.health}/100* (-${Math.floor(enemy.dmg / 2)})\n` +
            `💳 Balance: *${uDun.money}*\n\n` +
            `_Next dungeon in 6 hours._`
          );
        } else {
          uDun.health = Math.max(1, (uDun.health || 100) - enemy.dmg);
          saveDB(dbDun);
          await replyWithThumb("dungeon",
            `💀 *Defeated!*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `👹 *${enemy.name}* was too strong!\n` +
            `❤️ HP: *${uDun.health}/100* (-${enemy.dmg})\n\n` +
            `_Use *${prefix}heal* to restore HP.\nNext dungeon in 6 hours._`
          );
        }
        break;
      }

      case "top": {
        const lbTop = getLeaderboard(10);
        if (!lbTop.length) { await reply(`No registered users yet! Use *${prefix}reg* to create a profile.`); break; }
        const medals = ["🥇","🥈","🥉"];
        const topRows = lbTop.map((u, i) => {
          const icon = medals[i] ?? `${i + 1}.`;
          return `${icon} *${u.name || u.jid.split("@")[0]}* — Lv.${u.level || 0} (${u.exp || 0} XP)`;
        }).join("\n");
        await replyWithThumb("top", `🏆 *Top Players*\n━━━━━━━━━━━━━━━━━━━\n${topRows}`);
        break;
      }

      case "givexp": {
        const gxMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const gxTarget = gxMentioned[0];
        const gxAmt = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!gxTarget || !gxAmt || gxAmt <= 0) { await reply(`Usage: ${prefix}givexp @user <amount>`); break; }
        initUserDB(gxTarget, "User");
        const dbGx = loadDB();
        const uGx = dbGx.users[gxTarget];
        uGx.exp = (uGx.exp || 0) + gxAmt;
        while (uGx.exp >= (uGx.level + 1) * 100) { uGx.exp -= (uGx.level + 1) * 100; uGx.level++; }
        saveDB(dbGx);
        await reply(`✅ Gave *${gxAmt} XP* to @${gxTarget.split("@")[0].split(":")[0]} (now Lv.${uGx.level})`);
        break;
      }

      case "addcoins": {
        const acMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const acTarget = acMentioned[0];
        const acAmt = parseInt(args.find(a => /^\d+$/.test(a)) || "0");
        if (!acTarget || !acAmt || acAmt <= 0) { await reply(`Usage: ${prefix}addcoins @user <amount>`); break; }
        initUserDB(acTarget, "User");
        const dbAc = loadDB();
        dbAc.users[acTarget].money = (dbAc.users[acTarget].money || 0) + acAmt;
        saveDB(dbAc);
        await reply(`✅ Added *${acAmt} coins* to @${acTarget.split("@")[0].split(":")[0]}\n💳 Balance: *${dbAc.users[acTarget].money}*`);
        break;
      }

      case "resetprofile": {
        const rpMentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
        const rpTarget = rpMentioned[0];
        if (!rpTarget) { await reply(`Usage: ${prefix}resetprofile @user`); break; }
        const dbRp = loadDB();
        if (!dbRp.users[rpTarget]) { await reply("❌ User not found in database."); break; }
        const rpName = dbRp.users[rpTarget].name || "User";
        const rpPremium = dbRp.users[rpTarget].premium || false;
        dbRp.users[rpTarget] = {
          level: 0, exp: 0, money: 0, bank: 0, health: 100,
          limitfree: 15, limitprem: 0, limitbuy: 0,
          lastmining: 0, lastdungeon: 0, lastwork: 0, lastdaily: 0,
          name: rpName, registered: false, premium: rpPremium,
          bio: "", badges: [], msgCount: 0, redeemedKeys: [],
        };
        saveDB(dbRp);
        await reply(`✅ Profile of @${rpTarget.split("@")[0].split(":")[0]} has been reset.`);
        break;
      }

      // ── Search (free APIs — no key needed) ───────────────────────────────────

      case "github": {
const username = args[0]?.trim();

if (!username) {
await reply(`Usage: ${prefix}github <username>`);
break;
}

try {
const res = await fetch(
`https://api.github.com/users/${encodeURIComponent(username)}`
);

if (!res.ok) {
  await reply(`❌ User *${username}* not found on GitHub.`);
  break;
}

const u = await res.json();

const msgx = generateWAMessageFromContent(jid, {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: {
        body: {
          text:
            `🐙 *GitHub: ${u.login}*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            `📛 *Name:* ${u.name ?? "—"}\n` +
            `📝 *Bio:* ${u.bio ?? "—"}\n` +
            `📦 *Repos:* ${u.public_repos}\n` +
            `👥 *Followers:* ${u.followers} | *Following:* ${u.following}\n` +
            `🌍 *Location:* ${u.location ?? "—"}\n` +
            `🔗 ${u.html_url}`
        },
        footer: {
          text: settings.botName ?? "Yuzuki MD"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🐙 Open GitHub",
                url: u.html_url,
                merchant_url: u.html_url
              })
            }
          ]
        }
      }
    }
  }
}, { quoted: msg });

await sock.relayMessage(
  jid,
  msgx.message,
  { messageId: msgx.key.id }
);

} catch {
await reply("❌ Failed to fetch GitHub profile.");
}

break;
}

      case "trivia": {
        try {
          const res = await fetch("https://opentdb.com/api.php?amount=1&type=multiple");
          const data = await res.json();
          const q = data.results?.[0];
          if (!q) { await reply("❌ Could not fetch a trivia question. Try again."); break; }
          const answers = [...q.incorrect_answers, q.correct_answer].sort(() => Math.random() - 0.5);
          const labels = ["A","B","C","D"];
          const text =
            `🎯 *Trivia*\n━━━━━━━━━━━━━━━━━━━\n` +
            `*${q.question.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'")}*\n\n` +
            answers.map((a, i) => `${labels[i]}. ${a.replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#039;/g,"'")}`).join("\n") +
            `\n\n_Category: ${q.category} | Difficulty: ${q.difficulty}_`;
          await replyChannel(text);
        } catch { await reply("❌ Failed to fetch trivia question."); }
        break;
      }

      case "urban": {
        const term = args.join(" ").trim();
        if (!term) { await reply(`Usage: ${prefix}urban <word>`); break; }
        try {
          const res = await fetch(`https://api.urbandictionary.com/v0/define?term=${encodeURIComponent(term)}`);
          const data = await res.json();
          const entry = data.list?.[0];
          if (!entry) { await reply(`❌ No definition found for *${term}*.`); break; }
          const def = entry.definition.replace(/[[]]/g, "").slice(0, 400);
          const ex = entry.example.replace(/[[]]/g, "").slice(0, 200);
          const urbanText = `📖 *${entry.word}*\n━━━━━━━━━━━━━━━━━━━\n${def}${ex ? `\n\n_Example: ${ex}_` : ""}`;
          const urbanUrl = `https://www.urbandictionary.com/define.php?term=${encodeURIComponent(term)}`;
          const msxUrban = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: urbanText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📖 Open Urban Dictionary", url: urbanUrl, merchant_url: urbanUrl }) },
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Definition", copy_code: def }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxUrban.message, { messageId: msxUrban.key.id });
        } catch { await reply("❌ Failed to fetch definition."); }
        break;
      }

      case "wiki": {
const query = args.join(" ").trim();

if (!query) {
await reply(`Usage: ${prefix}wiki <topic>`);
break;
}

try {
const searchRes = await fetch(
`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`
);

const searchData = await searchRes.json();
const title = searchData.query?.search?.[0]?.title;

if (!title) {
  await reply(`❌ Nothing found for *${query}* on Wikipedia.`);
  break;
}

const summaryRes = await fetch(
  `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
);

const s = await summaryRes.json();
const wikiUrl = s.content_urls?.desktop?.page ?? "";

const wikiThumb = s.thumbnail?.source || s.originalimage?.source || null;
const wikiPayload = await previewCard(
  `📚 *${s.title}*\n━━━━━━━━━━━━━━━━━━━\n${s.extract?.slice(0, 500) ?? "No summary available."}`,
  {
    title: s.title,
    body: `📖 Wikipedia`,
    thumbUrl: wikiThumb,
    sourceUrl: wikiUrl,
  }
);
await sock.sendMessage(jid, wikiPayload, { quoted: msg });

} catch {
await reply("❌ Failed to fetch Wikipedia article.");
}

break;
}

      // ── Stubs: need external API keys or services ─────────────────────────────

      case "meme": {
try {
const res = await fetch("https://meme-api.com/gimme/5");
const data = await res.json();

if (!data?.memes?.length) {
  await reply("❌ Could not fetch memes right now. Try again.");
  break;
}

const cards = await Promise.all(
  data.memes.map(async (meme) => {
    const media = await prepareWAMessageMedia(
      {
        image: { url: meme.url }
      },
      {
        upload: sock.waUploadToServer
      }
    );

    return {
      header: {
        ...media,
        title: "",
        subtitle: `r/${meme.subreddit}`,
        hasMediaAttachment: true
      },
      body: {
        text:
          `😂 *${meme.title}*\n` +
          `👍 ${meme.ups} upvotes`
      },
      nativeFlowMessage: {
        buttons: [
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "🔗 Open Reddit Post",
              url: meme.postLink,
              merchant_url: meme.postLink
            })
          }
        ]
      }
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
          body: {
            text: "😂 Meme Carousel • Swipe for more memes"
          },
          carouselMessage: {
            cards,
            messageVersion: 1
          }
        }
      }
    }
  },
  { quoted: msg }
);

await sock.relayMessage(
  jid,
  carouselMsg.message,
  { messageId: carouselMsg.key.id }
);

} catch (e) {
await reply(`❌ Failed to fetch memes: ${e.message}`);
}

break;
}

      case "sticker": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply(`Reply to an image with ${prefix}sticker`);break;}
        try{const { default: sharp } = await import("sharp"); const webp=await sharp(dl.buf).resize(512,512,{fit:"contain",background:{r:0,g:0,b:0,alpha:0}}).webp({quality:80}).toBuffer();await sock.sendMessage(jid,{sticker:webp},{quoted:msg});}catch(e){await reply(`❌ Sticker: ${e.message}`);}
        break;
      }

      case "toimg": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.stickerMessage){await reply(`Reply to a sticker with ${prefix}toimg`);break;}
        try{const { default: sharp } = await import("sharp"); const png=await sharp(dl.buf).png().toBuffer();await sock.sendMessage(jid,{image:png,caption:"🖼️ Converted from sticker"},{quoted:msg});}catch(e){await reply(`❌ toimg: ${e.message}`);}
        break;
      }

      // ── View-once bypass — .vv / .rv / .rvo ─────────────────────────
      case "vv":
      case "rv":
      case "rvo": {
        // Extract contextInfo from any message container WhatsApp may use.
        // Disappearing-message chats wrap the command in ephemeralMessage,
        // newer clients may use normalTextMessage — check all paths.
        const msgContent = msg.message ?? {};
        const ctx2 =
          msgContent.extendedTextMessage?.contextInfo ??
          msgContent.ephemeralMessage?.message?.extendedTextMessage?.contextInfo ??
          msgContent.normalTextMessage?.contextInfo ??
          msgContent.imageMessage?.contextInfo ??
          msgContent.videoMessage?.contextInfo;

        if (!ctx2?.quotedMessage) {
          await reply(`👁 Reply to a view-once photo, video or audio with *${prefix}${command}*`);
          break;
        }

        // Quoted message may itself be wrapped in ephemeral or other containers.
        const qmRaw = ctx2.quotedMessage;
        const qm = qmRaw?.ephemeralMessage?.message ?? qmRaw;

        // Try all known view-once outer wrappers (v1 / v2 / v2Extension).
        let voInner =
          qm?.viewOnceMessage?.message ??
          qm?.viewOnceMessageV2?.message ??
          qm?.viewOnceMessageV2Extension?.message;

        // Fallback: newer WhatsApp versions strip the outer viewOnce wrapper when
        // storing the quoted message, leaving just imageMessage / videoMessage /
        // audioMessage directly in qm.  Accept those as valid view-once content.
        if (!voInner && (qm?.imageMessage || qm?.videoMessage || qm?.audioMessage)) {
          voInner = qm;
        }

        if (!voInner) {
          await reply("❌ That message is not a view-once. Make sure you reply directly to the view-once message (not a forward or a copy).");
          break;
        }

        try {
          const fakeMsg = {
            key: {
              remoteJid: jid,
              id: ctx2.stanzaId,
              fromMe: ctx2.fromMe ?? false,
              participant: ctx2.participant,
            },
            message: voInner,
          };
          const buf = await downloadMediaMessage(fakeMsg, "buffer", {});
          const senderName = ctx2.participant
            ? `@${ctx2.participant.split("@")[0]}`
            : "someone";
          const caption = `👁 *View-Once revealed*  •  _sent by ${senderName}_`;
          if (voInner.imageMessage) {
            await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
          } else if (voInner.videoMessage) {
            await sock.sendMessage(jid, { video: buf, caption, mimetype: "video/mp4" }, { quoted: msg });
          } else if (voInner.audioMessage) {
            await sock.sendMessage(jid, { audio: buf, mimetype: "audio/ogg; codecs=opus", ptt: true }, { quoted: msg });
            await reply(caption);
          } else {
            await reply("❌ Unsupported view-once media type.");
          }
        } catch (e) {
          await reply(`❌ Could not reveal: ${e.message}`);
        }
        break;
      }

      case "tts": {
        const text3=args.join(" ").trim();if(!text3){await reply(`Usage: ${prefix}tts <text>`);break;}
        try{const ttsUrl=`https://api.streamelements.com/kappa/v2/speech?voice=Brian&text=${encodeURIComponent(text3)}`;const resp=await fetch(ttsUrl);if(!resp.ok)throw new Error(`TTS API error: ${resp.status}`);const buf=Buffer.from(await resp.arrayBuffer());await sock.sendMessage(jid,{audio:buf,mimetype:"audio/mpeg",ptt:true},{quoted:msg});}catch(e){await reply(`❌ TTS: ${e.message}`);}
        break;
      }

      case "stt": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.audioMessage){await reply(`Reply to a voice note with ${prefix}stt`);break;}
        if(!process.env.GROQ_API_KEY){await reply("❌ GROQ_API_KEY not set. Get a free key at https://console.groq.com");break;}
        try{const fd=new FormData();fd.append("file",new File([dl.buf],"audio.ogg",{type:"audio/ogg; codecs=opus"}));fd.append("model","whisper-large-v3-turbo");const r=await fetch("https://api.groq.com/openai/v1/audio/transcriptions",{method:"POST",headers:{"Authorization":`Bearer ${process.env.GROQ_API_KEY}`},body:fd});if(!r.ok)throw new Error(`Groq STT error: ${r.status}`);const d=await r.json();await replyChannel(`🎙️ *Transcript:*\n${d.text}`);}catch(e){await reply(`❌ STT: ${e.message}`);}
        break;
      }

      case "qr": {
        const text4=args.join(" ").trim();if(!text4){await reply(`Usage: ${prefix}qr <text or URL>`);break;}
        try{const buf=await QRCode.toBuffer(text4,{width:512,margin:2});await sock.sendMessage(jid,{image:buf,caption:`📷 QR: ${text4.slice(0,60)}${text4.length>60?"...":""}`},{quoted:msg});}catch(e){await reply(`❌ QR: ${e.message}`);}
        break;
      }

      case "readqr": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply("Reply to an image containing a QR code");break;}
        try{const {Jimp}=await import("jimp");const jsQR=_require("jsqr");const img=await Jimp.fromBuffer(dl.buf);const {data,width,height}=img.bitmap;const code=jsQR(Uint8ClampedArray.from(data),width,height);if(code){await replyChannel(`📷 *QR Content:*\n${code.data}`);}else{await reply("❌ No QR code found in image.");}}catch(e){await reply(`❌ Read QR: ${e.message}`);}
        break;
      }

      case "short": {
const u = args[0]?.trim();

if (!u || !/^https?:\/\/.+/i.test(u)) {
await reply(`Usage: ${prefix}short <url>`);
break;
}

try {
const r = await fetch(
`https://tinyurl.com/api-create.php?url=${encodeURIComponent(u)}`
);

const s = await r.text();

if (!s.startsWith("https://")) {
  await reply("❌ Failed.");
  break;
}

const msgx = generateWAMessageFromContent(jid, {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: {
        body: {
          text: `🔗 *Shortened URL:*\n${s}`
        },
        footer: {
          text: settings.botName ?? "Yuzuki MD"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🌐 Open Link",
                url: s,
                merchant_url: s
              })
            },
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Link",
                copy_code: s
              })
            }
          ]
        }
      }
    }
  }
}, { quoted: msg });

await sock.relayMessage(
  jid,
  msgx.message,
  { messageId: msgx.key.id }
);

} catch (e) {
await reply(`❌ Short: ${e.message}`);
}

break;
}

      case "ss": {
        const u=args[0]?.trim();if(!u||!/^https?:\/\/.+/i.test(u)){await reply(`Usage: ${prefix}ss <url>`);break;}
        try{await sock.sendMessage(jid,{image:{url:`https://image.thum.io/get/width/1280/crop/800/${encodeURIComponent(u)}`},caption:`📸 ${u}`},{quoted:msg});}catch(e){await reply(`❌ Screenshot: ${e.message}`);}
        break;
      }

      case "crop": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply(`Reply to an image with ${prefix}crop <WxH+X+Y>`);break;}
        const spec=args[0];if(!spec){await reply(`Usage: ${prefix}crop <WxH+X+Y>  e.g. 200x200+0+0`);break;}
        const m=spec.match(/(\d+)x(\d+)(?:\+(\d+)\+(\d+))?/);if(!m){await reply("Invalid format. Example: 200x200+0+0");break;}
        try{const { default: sharp } = await import("sharp"); const out=await sharp(dl.buf).extract({width:parseInt(m[1]),height:parseInt(m[2]),left:parseInt(m[3]||0),top:parseInt(m[4]||0)}).toBuffer();await sock.sendMessage(jid,{image:out,caption:`✂️ Cropped: ${spec}`},{quoted:msg});}catch(e){await reply(`❌ Crop: ${e.message}`);}
        break;
      }
      case "resize": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply(`Reply to an image with ${prefix}resize <WxH>`);break;}
        const spec=args[0];if(!spec){await reply(`Usage: ${prefix}resize <WxH>  e.g. 512x512`);break;}
        const m=spec.match(/(\d+)x(\d+)/);if(!m){await reply("Invalid format. Example: 512x512");break;}
        try{const { default: sharp } = await import("sharp"); const out=await sharp(dl.buf).resize(parseInt(m[1]),parseInt(m[2]),{fit:"fill"}).toBuffer();await sock.sendMessage(jid,{image:out,caption:`🔄 Resized: ${spec}`},{quoted:msg});}catch(e){await reply(`❌ Resize: ${e.message}`);}
        break;
      }

      case "chatgpt": {
        const text=args.join(" ").trim();if(!text){await reply(`Usage: ${prefix}chatgpt <message>`);break;}
        try{const res=await polliText([{role:"user",content:text}],"openai");const msgx = generateWAMessageFromContent(jid,{
  viewOnceMessage:{
    message:{
      messageContextInfo:{
        deviceListMetadata:{},
        deviceListMetadataVersion:2,
      },
      interactiveMessage:{
        body:{ text:`🤖 *ChatGPT:*\n${res}` },
        footer:{ text: settings.botName ?? "Yuzuki MD" },
        nativeFlowMessage:{
          buttons:[{
            name:"cta_copy",
            buttonParamsJson:JSON.stringify({
              display_text:"📋 Copy Response",
              copy_code:res
            })
          }]
        }
      }
    }
  }
},{ quoted: msg });

await sock.relayMessage(jid,msgx.message,{ messageId: msgx.key.id });}catch(e){await reply(`❌ ChatGPT: ${e.message}`);}
        break;
      }
      case "claude": {
        const text=args.join(" ").trim();if(!text){await reply(`Usage: ${prefix}claude <message>`);break;}
        try{const res=await polliText([{role:"user",content:text}],"openai-large");const msgx = generateWAMessageFromContent(jid,{
  viewOnceMessage:{
    message:{
      messageContextInfo:{
        deviceListMetadata:{},
        deviceListMetadataVersion:2,
      },
      interactiveMessage:{
        body:{ text:`🧠 *Claude:*\n${res}` },
        footer:{ text: settings.botName ?? "Yuzuki MD" },
        nativeFlowMessage:{
          buttons:[{
            name:"cta_copy",
            buttonParamsJson:JSON.stringify({
              display_text:"📋 Copy Response",
              copy_code:res
            })
          }]
        }
      }
    }
  }
},{ quoted: msg });

await sock.relayMessage(jid,msgx.message,{ messageId: msgx.key.id });}catch(e){await reply(`❌ Claude: ${e.message}`);}
        break;
      }

      case "gemini": {
        const text=args.join(" ").trim();if(!text){await reply(`Usage: ${prefix}gemini <message>`);break;}
        try{const res=await polliText([{role:"user",content:text}],"gemini");const msgx = generateWAMessageFromContent(jid,{
  viewOnceMessage:{
    message:{
      messageContextInfo:{
        deviceListMetadata:{},
        deviceListMetadataVersion:2,
      },
      interactiveMessage:{
        body:{ text:`✨ *Gemini:*\n${res}` },
        footer:{ text: settings.botName ?? "Yuzuki MD" },
        nativeFlowMessage:{
          buttons:[{
            name:"cta_copy",
            buttonParamsJson:JSON.stringify({
              display_text:"📋 Copy Response",
              copy_code:res
            })
          }]
        }
      }
    }
  }
},{ quoted: msg });

await sock.relayMessage(jid,msgx.message,{ messageId: msgx.key.id });}catch(e){await reply(`❌ Gemini: ${e.message}`);}
        break;
      }

      case "imagine":
      case "dalle": {
        const p=args.join(" ").trim();if(!p){await reply(`Usage: ${prefix}${command} <prompt>`);break;}
        try{const imgUrl=`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?nologo=true&width=1024&height=1024&seed=${Math.floor(Math.random()*99999)}`;await sock.sendMessage(jid,{image:{url:imgUrl},caption:`🎨 *${p}*`},{quoted:msg});}catch(e){await reply(`❌ Image gen: ${e.message}`);}
        break;
      }
      case "aiart": {
        const p=args.join(" ").trim();if(!p){await reply(`Usage: ${prefix}aiart <prompt>`);break;}
        try{const imgUrl=`https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?nologo=true&width=1024&height=1024&model=flux&seed=${Math.floor(Math.random()*99999)}`;await sock.sendMessage(jid,{image:{url:imgUrl},caption:`🎨 *${p}*`},{quoted:msg});}catch(e){await reply(`❌ AI Art: ${e.message}`);}
        break;
      }

      case "remini":
      case "enhance": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply(`Reply to an image with ${prefix}${command}`);break;}
        try{const mime=dl.qm.imageMessage.mimetype||"image/jpeg";const ext=mime.split("/")[1]?.split(";")[0]||"jpg";const res=await mathgpt({question:"1) Describe what is in this image. 2) Rate quality/lighting/sharpness out of 10. 3) Give 3 specific enhancement suggestions.",image:dl.buf,mime,ext});await replyChannel(`✨ *Image Analysis (${command}):*\n${res}`);}catch(e){await reply(`❌ ${command}: ${e.message}`);}
        break;
      }

      case "detect":
      case "caption": {
        const dl=await dlQuoted(msg,jid);if(!dl?.qm?.imageMessage){await reply(`Reply to an image with ${prefix}${command}`);break;}
        try{const mime=dl.qm.imageMessage.mimetype||"image/jpeg";const ext=mime.split("/")[1]?.split(";")[0]||"jpg";const prompt=command==="detect"?"List all objects, people, text, and notable elements visible in this image. Be specific.":"Write a creative 1-2 sentence caption for this image.";const res=await mathgpt({question:prompt,image:dl.buf,mime,ext});await replyChannel(`${command==="detect"?"🔍":"💬"} *${command==="detect"?"Detected":"Caption"}:*\n${res}`);}catch(e){await reply(`❌ ${command}: ${e.message}`);}
        break;
      }

      case "summarize": {
const ctx2 = msg.message?.extendedTextMessage?.contextInfo;
const qt =
ctx2?.quotedMessage?.conversation ||
ctx2?.quotedMessage?.extendedTextMessage?.text;

const toSum = args.join(" ").trim() || qt;

if (!toSum) {
await reply(
`Usage: ${prefix}summarize <text>  or reply to a message`
);
break;
}

try {
const res = await polliText(
[
{
role: "user",
content: `Summarize in clear bullet points:\n\n${toSum}`
}
],
"openai"
);

const msgx = generateWAMessageFromContent(jid, {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: {
        body: {
          text: `📝 *Summary:*\n${res}`
        },
        footer: {
          text: settings.botName ?? "Yuzuki MD"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Summary",
                copy_code: res
              })
            }
          ]
        }
      }
    }
  }
}, { quoted: msg });

await sock.relayMessage(
  jid,
  msgx.message,
  { messageId: msgx.key.id }
);

} catch (e) {
await reply(`❌ Summarize: ${e.message}`);
}

break;
}

      case "translate": {
const lang = args[0]?.toLowerCase();
const text2 = args.slice(1).join(" ").trim();

if (!lang || !text2) {
await reply(
`Usage: ${prefix}translate <lang_code> <text>\nCodes: en es fr de ja zh ar pt ru ko hi`
);
break;
}

try {
const r = await fetch(
`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text2)}&langpair=en|${encodeURIComponent(lang)}`
);

const d = await r.json();
const tr = d.responseData?.translatedText;

if (!tr || tr === text2) {
  await reply("❌ Translation failed. Check the language code.");
  break;
}

const msgx = generateWAMessageFromContent(jid, {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: {
        body: {
          text: `🌐 *Translated (→${lang}):*\n${tr}`
        },
        footer: {
          text: settings.botName ?? "Yuzuki MD"
        },
        nativeFlowMessage: {
          buttons: [
            {
              name: "cta_copy",
              buttonParamsJson: JSON.stringify({
                display_text: "📋 Copy Translation",
                copy_code: tr
              })
            }
          ]
        }
      }
    }
  }
}, { quoted: msg });

await sock.relayMessage(
  jid,
  msgx.message,
  { messageId: msgx.key.id }
);

} catch (e) {
await reply(`❌ Translate: ${e.message}`);
}

break;
}

      case "ytmp3": {
        const url=args[0]?.trim();if(!url||!/youtu/.test(url)){await reply(`Usage: ${prefix}ytmp3 <YouTube URL>`);break;}
        await reply("⏳ Downloading audio...");
        try{
          const info=await ytdl.getInfo(url);
          const dur=parseInt(info.videoDetails.lengthSeconds);
          if(dur>600){await reply("❌ Video too long (max 10 min).");break;}
          const fmt=ytdl.chooseFormat(info.formats,{quality:"highestaudio",filter:"audioonly"});
          const chunks=[];await new Promise((res,rej)=>{const s=ytdl.downloadFromInfo(info,{format:fmt});s.on("data",c=>chunks.push(c));s.on("end",res);s.on("error",rej);});
          const buf=Buffer.concat(chunks);if(buf.length>64*1024*1024){await reply("❌ Too large.");break;}
          const ytmp3Thumb=info.videoDetails.thumbnails?.slice(-1)[0]?.url||"";
          await sock.sendMessage(jid,{audio:buf,mimetype:fmt.mimeType?.split(";")[0]||"audio/webm",fileName:`${info.videoDetails.title.slice(0,40)}.webm`,contextInfo:{externalAdReply:{title:info.videoDetails.title.slice(0,60),body:info.videoDetails.author?.name||"",thumbnailUrl:ytmp3Thumb,mediaType:1,sourceUrl:url}}},{quoted:msg});
        }catch(e){await reply(`❌ ytmp3: ${e.message}`);}
        break;
      }
      case "ytmp4": {
        const url=args[0]?.trim();if(!url||!/youtu/.test(url)){await reply(`Usage: ${prefix}ytmp4 <YouTube URL>`);break;}
        await reply("⏳ Downloading video...");
        try{
          const info=await ytdl.getInfo(url);
          const dur=parseInt(info.videoDetails.lengthSeconds);
          if(dur>300){await reply("❌ Video too long (max 5 min for video).");break;}
          const fmt=ytdl.chooseFormat(info.formats,{quality:"lowestvideo",filter:f=>f.hasAudio&&f.hasVideo});
          if(!fmt){await reply("❌ No suitable format found.");break;}
          const chunks=[];await new Promise((res,rej)=>{const s=ytdl.downloadFromInfo(info,{format:fmt});s.on("data",c=>chunks.push(c));s.on("end",res);s.on("error",rej);});
          const buf=Buffer.concat(chunks);if(buf.length>64*1024*1024){await reply("❌ Too large.");break;}
          const ytmp4Thumb=info.videoDetails.thumbnails?.slice(-1)[0]?.url||"";
          await sock.sendMessage(jid,{video:buf,caption:`🎬 ${info.videoDetails.title}`,mimetype:"video/mp4",contextInfo:{externalAdReply:{title:info.videoDetails.title.slice(0,60),body:info.videoDetails.author?.name||"",thumbnailUrl:ytmp4Thumb,mediaType:1,renderLargerThumbnail:true,sourceUrl:url}}},{quoted:msg});
        }catch(e){await reply(`❌ ytmp4: ${e.message}`);}
        break;
      }

      case "igdl": {
        const u=args[0]?.trim();if(!u||!/instagram\.com/.test(u)){await reply(`Usage: ${prefix}igdl <Instagram URL>`);break;}
        await reply("⏳ Fetching from Instagram...");
        try{
          const r=await fetch(`https://api.fastdl.app/api/convert`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:u})});
          const d=await r.json();
          if(!d?.medias?.length){
            const r2=await fetch(`https://igdownloader.app/api/ajaxSearch`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:`recaptchaToken=&q=${encodeURIComponent(u)}&t=media&lang=en`});
            const d2=await r2.json();if(!d2?.data){await reply("❌ Could not fetch. The post may be private.");break;}
            await sock.sendMessage(jid,{text:`📥 *Instagram Download*\n${d2.data.replace(/<[^>]+>/g," ").trim().slice(0,500)}`},{quoted:msg});break;
          }
          // Use first image media as thumbnail for the preview strip
          const igdlThumb=d.medias.find(m=>m.type==="image"||m.url?.includes(".jpg")||m.url?.includes(".png"))?.url||"";
          for(let igdlIdx=0;igdlIdx<d.medias.slice(0,3).length;igdlIdx++){
            const m=d.medias[igdlIdx];
            const igdlCtx=igdlIdx===0&&igdlThumb?{externalAdReply:{title:"Instagram Download",body:`${d.medias.length} media item${d.medias.length>1?"s":""}`,thumbnailUrl:igdlThumb,mediaType:1,sourceUrl:u}}:undefined;
            if(m.type==="video"||m.url?.includes(".mp4")){
              await sock.sendMessage(jid,{video:{url:m.url},caption:"📥 Instagram Video",...(igdlCtx?{contextInfo:igdlCtx}:{})},{quoted:msg});
            }else{
              await sock.sendMessage(jid,{image:{url:m.url},caption:"📥 Instagram Image",...(igdlCtx?{contextInfo:igdlCtx}:{})},{quoted:msg});
            }
          }
        }catch(e){await reply(`❌ igdl: ${e.message}`);}
        break;
      }

      case "tiktok": {
        const u=args[0]?.trim();if(!u||!/tiktok\.com/.test(u)){await reply(`Usage: ${prefix}tiktok <TikTok URL>`);break;}
        await reply("⏳ Fetching TikTok video...");
        try{
          const r=await fetch(`https://tikwm.com/api/?url=${encodeURIComponent(u)}`);
          const d=await r.json();
          if(d.code!==0||!d.data){await reply("❌ Could not fetch. Check the URL.");break;}
          const v=d.data;
          const vidUrl=v.play||v.hdplay||v.wmplay;
          if(!vidUrl){await reply("❌ No video found.");break;}
          await sock.sendMessage(jid,{video:{url:vidUrl},caption:`📥 *${v.title?.slice(0,100)||"TikTok Video"}*\n👤 ${v.author?.nickname||"?"}  👁 ${fmtNum(v.play_count)}  ❤️ ${fmtNum(v.digg_count)}`,contextInfo:{externalAdReply:{title:v.title?.slice(0,60)||"TikTok Video",body:`👤 ${v.author?.nickname||"?"} • ❤️ ${fmtNum(v.digg_count)}`,thumbnailUrl:v.cover||"",mediaType:1,renderLargerThumbnail:true,sourceUrl:u}}},{quoted:msg});
        }catch(e){await reply(`❌ tiktok: ${e.message}`);}
        break;
      }

      case "fbdl": {
        const u=args[0]?.trim();if(!u||!/facebook\.com|fb\.watch/.test(u)){await reply(`Usage: ${prefix}fbdl <Facebook video URL>`);break;}
        await reply("⏳ Fetching Facebook video...");
        try{
          const r=await fetch(`https://api.fastdl.app/api/convert`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url:u})});
          const d=await r.json();
          const vid=d?.medias?.find(m=>m.type==="video")||d?.medias?.[0];
          if(!vid?.url){await reply("❌ Could not fetch. The video may be private or the URL is invalid.");break;}
          const fbThumb=d.thumbnail||d.medias?.find(m=>m.type==="image")?.url||"";
          await sock.sendMessage(jid,{video:{url:vid.url},caption:`📥 Facebook Video${d.title?` — ${d.title.slice(0,80)}`:""}`,contextInfo:{externalAdReply:{title:d.title||"Facebook Video",body:"📥 via Yuzuki MD",thumbnailUrl:fbThumb,mediaType:1,renderLargerThumbnail:true,sourceUrl:u}}},{quoted:msg});
        }catch(e){await reply(`❌ fbdl: ${e.message}`);}
        break;
      }

      case "twdl": {
        const u=args[0]?.trim();if(!u||!/twitter\.com|x\.com/.test(u)){await reply(`Usage: ${prefix}twdl <Twitter/X URL>`);break;}
        await reply("⏳ Fetching from Twitter/X...");
        try{
          const tweetId=u.match(/status\/(\d+)/)?.[1];
          if(!tweetId){await reply("❌ Could not extract tweet ID.");break;}
          const r=await fetch(`https://api.vxtwitter.com/Twitter/status/${tweetId}`);
          const d=await r.json();
          if(!d){await reply("❌ Could not fetch tweet.");break;}
          const twThumb=d.user_profile_image_url||"";
          const twCtx={externalAdReply:{title:`@${d.user_name||"Twitter"}`,body:d.text?.slice(0,80)||"",thumbnailUrl:twThumb,mediaType:1,renderLargerThumbnail:false,sourceUrl:u}};
          if(d.media_extended?.length){
            for(let twI=0;twI<d.media_extended.slice(0,2).length;twI++){
              const m=d.media_extended[twI];
              if(m.type==="video"||m.type==="gif"){
                await sock.sendMessage(jid,{video:{url:m.url},caption:`📥 @${d.user_name}: ${d.text?.slice(0,100)||""}`,contextInfo:twCtx},{quoted:msg});
              }else{
                await sock.sendMessage(jid,{image:{url:m.url},caption:`📥 @${d.user_name}: ${d.text?.slice(0,100)||""}`,contextInfo:twCtx},{quoted:msg});
              }
            }
          }else if(d.text){
            const twPayload=await previewCard(`📥 *@${d.user_name}:*\n${d.text||""}`,{title:`@${d.user_name||"Twitter"}`,body:(d.text||"").slice(0,60),thumbUrl:twThumb,sourceUrl:u});
            await sock.sendMessage(jid,twPayload,{quoted:msg});
          }else{await reply("❌ No media found in this tweet.");}
        }catch(e){await reply(`❌ twdl: ${e.message}`);}
        break;
      }

      case "spotdl": {
        const u=args[0]?.trim();if(!u||!/open\.spotify\.com/.test(u)){await reply(`Usage: ${prefix}spotdl <Spotify track URL>`);break;}
        await reply("⏳ Looking up track on Spotify...");
        try{
          const trackId=u.match(/track\/([a-zA-Z0-9]+)/)?.[1];
          if(!trackId){await reply("❌ Only track URLs are supported (not albums/playlists).");break;}
          const r=await fetch(`https://api.spotifydown.com/download/${trackId}`,{headers:{"Origin":"https://spotifydown.com","Referer":"https://spotifydown.com/"}});
          const d=await r.json();
          if(d.success&&d.link){
            const chunks=[];const resp=await fetch(d.link);const ab=await resp.arrayBuffer();const buf=Buffer.from(ab);
            if(buf.length>64*1024*1024){await reply("❌ File too large.");break;}
            await sock.sendMessage(jid,{audio:buf,mimetype:"audio/mpeg",fileName:`${d.metadata?.title||"spotify_track"}.mp3`,contextInfo:{externalAdReply:{title:d.metadata?.title||"Spotify Track",body:d.metadata?.artists||"",thumbnailUrl:d.metadata?.coverUrl||d.metadata?.cover||"",mediaType:1,sourceUrl:u}}},{quoted:msg});
          }else{
            await reply(`❌ Could not download. Try searching YouTube instead:\n${prefix}ytmp3 ${d.metadata?.title||"song name"}`);
          }
        }catch(e){await reply(`❌ spotdl: ${e.message}\n\n💡 Tip: Try ${prefix}ytmp3 <YouTube link of the song> instead.`);}
        break;
      }

      case "pinterest": {
        if (!text) { await reply(`📌 Usage: ${prefix}pinterest <search keyword>\nExample: ${prefix}pinterest anime girl`); break; }
        initUserDB(sender, pushname);
        const pinCost2 = getLimitCost("pinterest", 1);
        const pinLim2 = checkLimit(sender, isOwner(sender));
        if (pinLim2 !== "∞" && pinLim2 < pinCost2) { await reply(`❌ Not enough limit! Need *${pinCost2}*, you have *${pinLim2}*.`); break; }
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const images = await searchPinterestAPI(text, 10);
          if (!images?.length) throw new Error("No images found for that keyword.");
          const cards = await Promise.all(images.slice(0, 10).map(async (item, i) => ({
            header: {
              ...(await prepareWAMessageMedia({ image: { url: item.url } }, { upload: sock.waUploadToServer })),
              title: '',
              subtitle: `Image ${i + 1} of ${images.length}`,
              hasMediaAttachment: true,
            },
            body: { text: item.title ? `📌 ${item.title}` : '' },
            nativeFlowMessage: { buttons: [] }
          })));
          const carouselMsg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
              message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                  body: { text: `📌 *Pinterest Search*\n\n🔎 Query: _${text}_\n📷 ${images.length} results found` },
                  carouselMessage: { cards, messageVersion: 1 }
                }
              }
            }
          }, { quoted: msg });
          await sock.relayMessage(jid, carouselMsg.message, { messageId: carouselMsg.key.id });
          useLimit(sender, pinCost2, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          await reply(`❌ Pinterest search failed: ${e.message}`);
        }
        break;
      }

      case "gdrive": {
        const u=args[0]?.trim();if(!u||!/drive\.google\.com/.test(u)){await reply(`Usage: ${prefix}gdrive <Google Drive file URL>`);break;}
        const fid=u.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1]||u.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
        if(!fid){await reply("❌ Could not extract file ID from URL.");break;}
        await reply("⏳ Fetching from Google Drive...");
        try{
          const direct=`https://drive.google.com/uc?export=download&id=${fid}&confirm=t`;
          const r=await fetch(direct,{redirect:"follow"});
          if(!r.ok){await reply("❌ File not accessible. Make sure sharing is set to 'Anyone with the link'.");break;}
          const buf=Buffer.from(await r.arrayBuffer());
          if(buf.length>64*1024*1024){await reply("❌ File too large (>64MB). WhatsApp limit.");break;}
          const ct=r.headers.get("content-type")||"";
          const ext=ct.includes("pdf")?"pdf":ct.includes("image")?"jpg":ct.includes("video")?"mp4":"bin";
          if(ct.includes("video")){
            await sock.sendMessage(jid,{video:buf,caption:"📥 Google Drive Video"},{quoted:msg});
          }else if(ct.includes("image")){
            await sock.sendMessage(jid,{image:buf,caption:"📥 Google Drive Image"},{quoted:msg});
          }else if(ct.includes("audio")){
            await sock.sendMessage(jid,{audio:buf,mimetype:ct},{quoted:msg});
          }else{
            await sock.sendMessage(jid,{document:buf,mimetype:ct||"application/octet-stream",fileName:`gdrive_${fid}.${ext}`},{quoted:msg});
          }
        }catch(e){await reply(`❌ gdrive: ${e.message}`);}
        break;
      }

      case "mediafire": {
        const u=args[0]?.trim();if(!u||!/mediafire\.com/.test(u)){await reply(`Usage: ${prefix}mediafire <Mediafire URL>`);break;}
        await reply("⏳ Fetching from Mediafire...");
        try{
          const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},redirect:"follow"});
          const html=await r.text();
          const dl=html.match(/href="(https:\/\/download[^"]+)"/)?.[1]||html.match(/aria-label="Download file"\s+href="([^"]+)"/)?.[1];
          if(!dl){await reply("❌ Could not extract download link.");break;}
          const fname=html.match(/class="filename">([^<]+)/)?.[1]||"mediafire_file";
          const fsize=html.match(/class="fileSize">([^<]+)/)?.[1]||"?";
          const mfText = `📥 *Mediafire Download*\n━━━━━━━━━━━━━━━━━━━\n📄 *File:* ${fname}\n📦 *Size:* ${fsize}\n🔗 ${dl}`;
          const msxMf = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: mfText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📥 Download File", url: dl, merchant_url: dl }) },
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Link", copy_code: dl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxMf.message, { messageId: msxMf.key.id });
        }catch(e){await reply(`❌ mediafire: ${e.message}`);}
        break;
      }

      case "apk": {
const name = args.join(" ").trim();

if (!name) {
await reply(`Usage: ${prefix}apk <app name>`);
break;
}

try {
const r = await fetch(
`https://api.duckduckgo.com/?q=${encodeURIComponent(name + " APK download apkpure.com")}&format=json&no_redirect=1&no_html=1`
);

const d = await r.json();

const link = d.RelatedTopics?.find(
  t => t.FirstURL?.includes("apkpure")
)?.FirstURL;

const msgx = generateWAMessageFromContent(jid, {
  viewOnceMessage: {
    message: {
      messageContextInfo: {
        deviceListMetadata: {},
        deviceListMetadataVersion: 2,
      },
      interactiveMessage: {
        body: {
          text:
            `📥 *APK Search: ${name}*\n` +
            `━━━━━━━━━━━━━━━━━━━\n` +
            (link
              ? `🔗 Direct APK result found.\n\n`
              : `No direct APK link found.\n\n`) +
            `Use the buttons below to search APK repositories.`
        },
        footer: {
          text: settings.botName ?? "Yuzuki MD"
        },
        nativeFlowMessage: {
          buttons: [
            ...(link ? [{
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "📥 Open APK",
                url: link,
                merchant_url: link
              })
            }] : []),

            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "📦 APKPure",
                url: `https://apkpure.com/search?q=${encodeURIComponent(name)}`,
                merchant_url: `https://apkpure.com/search?q=${encodeURIComponent(name)}`
              })
            },

            {
              name: "cta_url",
              buttonParamsJson: JSON.stringify({
                display_text: "🔍 APKMirror",
                url: `https://www.apkmirror.com/?s=${encodeURIComponent(name)}`,
                merchant_url: `https://www.apkmirror.com/?s=${encodeURIComponent(name)}`
              })
            }
          ]
        }
      }
    }
  }
}, { quoted: msg });

await sock.relayMessage(
  jid,
  msgx.message,
  { messageId: msgx.key.id }
);

} catch (e) {
await reply(`❌ apk: ${e.message}`);
}

break;
}

      case "capcut": {
        const u=args[0]?.trim();if(!u||!/capcut/.test(u)){await reply(`Usage: ${prefix}capcut <CapCut template URL>`);break;}
        try{
          const r=await fetch(u,{headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"},redirect:"follow"});
          const html=await r.text();
          const vid=html.match(/property="og:video"\s+content="([^"]+)"/)?.[1];
          const title=html.match(/property="og:title"\s+content="([^"]+)"/)?.[1]||"CapCut Template";
          const thumb=html.match(/property="og:image"\s+content="([^"]+)"/)?.[1];
          if(vid){
            await sock.sendMessage(jid,{video:{url:vid},caption:`📥 *${title}*`},{quoted:msg});
          }else if(thumb){
            await sock.sendMessage(jid,{image:{url:thumb},caption:`📥 *${title}*\n\n_Video not extractable — here\'s the thumbnail._\n🔗 ${u}`},{quoted:msg});
          }else{
            await reply(`❌ Could not extract CapCut content. Open directly:\n🔗 ${u}`);
          }
        }catch(e){await reply(`❌ capcut: ${e.message}`);}
        break;
      }

      case "google":
      case "imgsearch": {
        const q=args.join(" ").trim();if(!q){await reply(`Usage: ${prefix}${command} <query>`);break;}
        try{
          const r=await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`);
          const d=await r.json();const abs=d.AbstractText||d.Answer;
          const rel=(d.RelatedTopics||[]).slice(0,3).filter(t=>t.FirstURL).map(t=>`• ${t.Text?.slice(0,80)}\n  🔗 ${t.FirstURL}`);
          if(!abs&&!rel.length){await reply(`❌ No results for *${q}*. Try a more specific term.`);break;}
          let txt=`🔍 *Search: ${q}*\n━━━━━━━━━━━━━━━━━━━\n`;
          if(abs)txt+=`${abs}\n\n`;
          if(rel.length)txt+=`*Related:*\n${rel.join("\n")}`;
          const ddgUrl = `https://duckduckgo.com/?q=${encodeURIComponent(q)}`;
          const msxGoo = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: txt },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🔍 Search on DuckDuckGo", url: ddgUrl, merchant_url: ddgUrl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxGoo.message, { messageId: msxGoo.key.id });
        }catch(e){await reply(`❌ Search: ${e.message}`);}
        break;
      }
      case "yts":
      case "ytsearch": {
        const q=args.join(" ").trim();if(!q){await reply(`Usage: ${prefix}ytsearch <query>`);break;}
        try{
          const videos=await ytSearch(q);
          if(!videos?.length){await reply("❌ No results found. Try again.");break;}
          const txt=`▶️ *YouTube: ${q}*\n━━━━━━━━━━━━━━━━━━━\n`+videos.slice(0,5).map((v,i)=>{
            const dur=v.lengthSeconds?`${Math.floor(v.lengthSeconds/60)}:${String(v.lengthSeconds%60).padStart(2,"0")}`:"?:??";
            return `${i+1}. *${v.title}*\n   ⏱ ${dur} · 👁 ${v.viewCount?.toLocaleString()??"?"} \n   🔗 https://youtu.be/${v.videoId}`;
          }).join("\n\n");
          const ytSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;
          const msxYts = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: txt },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🔍 Search on YouTube", url: ytSearchUrl, merchant_url: ytSearchUrl }) },
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "▶️ YouTube", url: "https://youtube.com", merchant_url: "https://youtube.com" }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxYts.message, { messageId: msxYts.key.id });
        }catch(e){await reply(`❌ YT Search: ${e.message}`);}
        break;
      }

      case "weather": {
        const city=args.join(" ").trim();if(!city){await reply(`Usage: ${prefix}weather <city>`);break;}
        try{
          const r=await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
          if(!r.ok){await reply(`❌ City not found: ${city}`);break;}const d=await r.json();
          const cur=d.current_condition[0],area=d.nearest_area[0];
          const weatherText = `🌤️ *Weather: ${area.areaName[0].value}, ${area.country[0].value}*\n━━━━━━━━━━━━━━━━━━━\n🌡️ *Temp:* ${cur.temp_C}°C (feels ${cur.FeelsLikeC}°C)\n☁️ *Condition:* ${cur.weatherDesc[0].value}\n💧 *Humidity:* ${cur.humidity}%\n💨 *Wind:* ${cur.windspeedKmph} km/h`;
          const wttrUrl = `https://wttr.in/${encodeURIComponent(city)}`;
          const wttrThumb = `https://wttr.in/${encodeURIComponent(city)}_1.png`;
          const weatherPayload = await previewCard(weatherText, {
            title: `${area.areaName[0].value}, ${area.country[0].value}`,
            body: `${cur.weatherDesc[0].value} • ${cur.temp_C}°C`,
            thumbUrl: wttrThumb,
            sourceUrl: wttrUrl,
          });
          await sock.sendMessage(jid, weatherPayload, { quoted: msg });
        }catch(e){await reply(`❌ Weather: ${e.message}`);}
        break;
      }

      case "news": {
        try{
          const r=await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
          const ids=await r.json();const top5=ids.slice(0,5);
          const stories=await Promise.all(top5.map(id=>fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`).then(r=>r.json())));
          const newsText=`📰 *Top Tech News*\n━━━━━━━━━━━━━━━━━━━\n`+stories.map((s,i)=>`${i+1}. *${s.title}*\n   🔗 ${s.url??"https://news.ycombinator.com/item?id="+s.id}`).join("\n\n");
          const newsPayload=await previewCard(newsText,{title:"🔥 Hacker News",body:`Top ${stories.length} stories right now`,thumbUrl:"https://news.ycombinator.com/y18.svg",sourceUrl:"https://news.ycombinator.com"});
          await sock.sendMessage(jid,newsPayload,{quoted:msg});
        }catch(e){await reply(`❌ News: ${e.message}`);}
        break;
      }

      case "lyric":
      case "lyrics": {
        const q=args.join(" ").trim();if(!q){await reply(`Usage: ${prefix}lyrics <artist> - <song>\nExample: ${prefix}lyrics Drake - Gods Plan`);break;}
        const parts=q.split(/\s*[\-–]\s*/);const artist=parts[0]?.trim(),song=parts[1]?.trim();
        if(!artist||!song){await reply(`Format: ${prefix}lyrics <artist> - <song>`);break;}
        try{
          const r=await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(song)}`);
          const d=await r.json();if(d.error||!d.lyrics){await reply(`❌ Lyrics not found for *${q}*`);break;}
          const lyr=d.lyrics.trim().slice(0,3000);
          const finalLyrics =
  `🎵 *${artist} — ${song}*\n━━━━━━━━━━━━━━━━━━━\n${lyr}${d.lyrics.length>3000?"\n...(truncated)":""}`;
          const lyricsPayload=await previewCard(finalLyrics,{title:`${artist} — ${song}`,body:`🎵 Lyrics${d.lyrics.length>3000?" (truncated)":""}`,thumbUrl:`https://wsrv.nl/?url=https://img.youtube.com/vi/${encodeURIComponent(song)}/hqdefault.jpg&w=300&h=300&fit=cover`,sourceUrl:`https://www.google.com/search?q=${encodeURIComponent(artist+" "+song+" lyrics")}`});
          await sock.sendMessage(jid,lyricsPayload,{quoted:msg});
        }catch(e){await reply(`❌ Lyrics: ${e.message}`);}
        break;
      }

      case "define": {
        const word=args.join(" ").trim();if(!word){await reply(`Usage: ${prefix}define <word>`);break;}
        try{
          const r=await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
          if(!r.ok){await reply(`❌ No definition found for *${word}*. Try ${prefix}urban ${word}`);break;}
          const data=await r.json();const entry=data[0];
          const meanings=entry.meanings.slice(0,2).map(m=>{const d=m.definitions[0];return `*${m.partOfSpeech}*: ${d.definition}${d.example?`\n_"${d.example}"_`:""}`;}).join("\n\n");
          const definitionText =
  `📖 *${entry.word}*\n━━━━━━━━━━━━━━━━━━━\n${meanings}`;
          const definePayload=await previewCard(definitionText,{title:entry.word,body:`📖 ${entry.meanings[0]?.partOfSpeech||"Definition"}  •  ${settings.botName??"Yuzuki MD"}`,sourceUrl:`https://en.wiktionary.org/wiki/${encodeURIComponent(entry.word)}`});
          await sock.sendMessage(jid,definePayload,{quoted:msg});
        }catch(e){await reply(`❌ Define: ${e.message}`);}
        break;
      }

      case "anime":
      case "manga":
        await reply(`🎌 *${command}*: Usage: ${prefix}${command} <title>\nRequires an anime/manga API (e.g. Jikan/MyAnimeList) to be configured.`);
        break;

      case "ttt": {
        const key=`ttt_${jid}_${senderJid}`,sub2=(args[0]??"").toLowerCase();
        if(sub2==="stop"||sub2==="end"){gameStates.delete(key);await reply("🎮 Game ended.");break;}
        let g=gameStates.get(key);
        if(!g||sub2==="new"||sub2==="start"){g={board:Array(9).fill(null)};gameStates.set(key,g);await reply(`🎮 *Tic-Tac-Toe*\nYou are ❌, bot is ⭕\n\n${tttBoard(g.board)}\n\nPick a number (1-9):`);break;}
        const mv=parseInt(args[0])-1;
        if(isNaN(mv)||mv<0||mv>8||g.board[mv]){await reply(`Invalid move.\n\n${tttBoard(g.board)}`);break;}
        g.board[mv]="X";
        if(tttWin(g.board,"X")){gameStates.delete(key);await reply(`❌ You win! 🎉\n\n${tttBoard(g.board)}`);break;}
        if(g.board.every(Boolean)){gameStates.delete(key);await reply(`Draw! 🤝\n\n${tttBoard(g.board)}`);break;}
        const bm=tttBot(g.board);g.board[bm]="O";
        if(tttWin(g.board,"O")){gameStates.delete(key);await reply(`⭕ Bot wins! 🤖\n\n${tttBoard(g.board)}`);break;}
        if(g.board.every(Boolean)){gameStates.delete(key);await reply(`Draw! 🤝\n\n${tttBoard(g.board)}`);break;}
        await reply(`${tttBoard(g.board)}\n\nYour move (1-9):`);
        break;
      }

      case "chess":
      case "wordle":
      case "akinator":
        await reply(`🎮 *${command}*: This game requires a dedicated engine. Coming soon!`);
        break;

      case "hangman": {
        const key=`hm_${jid}_${senderJid}`,inp=(args[0]??"").toLowerCase();
        if(inp==="stop"||inp==="end"){gameStates.delete(key);await reply("🎮 Game ended.");break;}
        let g=gameStates.get(key);
        if(!g||inp==="new"||inp==="start"){const w=HM_WORDS[Math.floor(Math.random()*HM_WORDS.length)];g={word:w,guessed:[],wrong:0};gameStates.set(key,g);await reply(`🔤 *Hangman!*\n\n${hmFig(0)}\n\nWord: *${w.split("").map(()=>"_").join(" ")}*\n❤️ Lives: 7\n\nGuess a letter!`);break;}
        if(!inp||inp.length!==1||!/[a-z]/.test(inp)){await reply("Send a single letter to guess!");break;}
        if(g.guessed.includes(inp)){await reply(`Already guessed *${inp}*!`);break;}
        g.guessed.push(inp);if(!g.word.includes(inp))g.wrong++;
        const disp=g.word.split("").map(l=>g.guessed.includes(l)?l:"_").join(" ");
        const solved=!disp.includes("_");
        if(g.wrong>=7){gameStates.delete(key);await reply(`${hmFig(7)}\n\nGame over! 💀 Word was *${g.word}*`);break;}
        if(solved){gameStates.delete(key);await reply(`${hmFig(g.wrong)}\n\n🎉 You got it! Word was *${g.word}*`);break;}
        const wrong=g.guessed.filter(l=>!g.word.includes(l));
        await reply(`${hmFig(g.wrong)}\n\nWord: *${disp}*\n❤️ Lives: ${7-g.wrong}\n❌ Wrong: ${wrong.join(", ")||"none"}\n\nGuess a letter!`);
        break;
      }

      case "blackjack": {
        const key=`bj_${jid}_${senderJid}`,sub3=(args[0]??"").toLowerCase();
        if(sub3==="stop"){gameStates.delete(key);await reply("🎮 Game ended.");break;}
        let g=gameStates.get(key);
        if(!g||sub3==="new"||sub3==="start"){const dk=bjDeck();const pl=[dk.pop(),dk.pop()],dl2=[dk.pop(),dk.pop()];g={deck:dk,player:pl,dealer:dl2};gameStates.set(key,g);const pv=bjVal(pl);await reply(`🃏 *Blackjack*\n━━━━━━━━━━━━━━━━━━━\n🧑 Your hand: ${pl.join(" ")} = *${pv}*\n🤖 Dealer: ${dl2[0]} 🂠\n\n${pv===21?"Blackjack! 🎉 Auto-stand...":"Reply *hit* or *stand*"}`);if(pv===21){while(bjVal(g.dealer)<17)g.dealer.push(g.deck.pop());const dv=bjVal(g.dealer);gameStates.delete(key);await reply(`🤖 Dealer: ${g.dealer.join(" ")} = *${dv}*\n\n${dv>21?"Dealer busts! You win! 🎉":21>dv?"You win! 🎉":21===dv?"Push — tie! 🤝":"Dealer wins. 🤖"}`);}break;}
        if(sub3==="hit"){g.player.push(g.deck.pop());const pv=bjVal(g.player);if(pv>21){gameStates.delete(key);await reply(`Your hand: ${g.player.join(" ")} = *${pv}*\n💥 Bust! You lose.`);break;}await reply(`Your hand: ${g.player.join(" ")} = *${pv}*\n${pv===21?"21!":"Reply *hit* or *stand*"}`);if(pv===21){while(bjVal(g.dealer)<17)g.dealer.push(g.deck.pop());const dv=bjVal(g.dealer);gameStates.delete(key);await reply(`🤖 Dealer: ${g.dealer.join(" ")} = *${dv}*\n\n${dv>21?"Dealer busts! You win! 🎉":21>dv?"You win! 🎉":21===dv?"Tie! 🤝":"Dealer wins. 🤖"}`);}break;}
        if(sub3==="stand"){while(bjVal(g.dealer)<17)g.dealer.push(g.deck.pop());const pv=bjVal(g.player),dv=bjVal(g.dealer);gameStates.delete(key);await reply(`🧑 Your hand: ${g.player.join(" ")} = *${pv}*\n🤖 Dealer: ${g.dealer.join(" ")} = *${dv}*\n\n${dv>21?"Dealer busts! You win! 🎉":pv>dv?"You win! 🎉":pv===dv?"Tie! 🤝":"Dealer wins. 🤖"}`);break;}
        await reply(`Your hand: ${g.player.join(" ")} = *${bjVal(g.player)}*\n🤖 Dealer: ${g.dealer[0]} 🂠\n\nReply *hit* or *stand*`);
        break;
      }

      case "ytinfo": {
        const url=args[0]?.trim();if(!url||!/youtu/.test(url)){await reply(`Usage: ${prefix}ytinfo <YouTube URL>`);break;}
        try{
          const info=await ytdl.getInfo(url);const d=info.videoDetails;
          const mins=Math.floor(parseInt(d.lengthSeconds)/60),secs=parseInt(d.lengthSeconds)%60;
          const ytInfoText = `▶️ *${d.title}*\n━━━━━━━━━━━━━━━━━━━\n👤 *Channel:* ${d.author.name}\n⏱️ *Duration:* ${mins}:${String(secs).padStart(2,"0")}\n👁️ *Views:* ${parseInt(d.viewCount).toLocaleString()}\n📅 *Published:* ${d.publishDate??"N/A"}\n🔗 ${d.video_url}`;
          const msxYti = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: ytInfoText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "▶️ Watch on YouTube", url: d.video_url, merchant_url: d.video_url }) },
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Link", copy_code: d.video_url }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxYti.message, { messageId: msxYti.key.id });
        }catch(e){await reply(`❌ ytinfo: ${e.message}`);}
        break;
      }
      case "ytplaylist": {
        const u=args[0]?.trim();if(!u){await reply(`Usage: ${prefix}ytplaylist <playlist URL>`);break;}
        const pid=extractPid(u);if(!pid){await reply("❌ Could not extract playlist ID. Use a full playlist URL.");break;}
        try{
          const d=await invGet(`/api/v1/playlists/${pid}`);
          if(!d||d.error){await reply("❌ Playlist not found.");break;}
          const top3=(d.videos||[]).slice(0,3).map((v,i)=>`  ${i+1}. *${v.title}* (${fmtDur(v.lengthSeconds)})`).join("\n");
          const plText = `📋 *${d.title}*\n━━━━━━━━━━━━━━━━━━━\n`+
            `👤 *Channel:* ${d.author}\n`+
            `📹 *Videos:* ${d.videoCount}\n`+
            `👁️ *Views:* ${fmtNum(d.viewCount)}\n\n`+
            `*Top videos:*\n${top3}\n\n`+
            `🔗 https://www.youtube.com/playlist?list=${pid}`;
          const plUrl = `https://www.youtube.com/playlist?list=${pid}`;
          const msxPl = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: plText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📋 Open Playlist", url: plUrl, merchant_url: plUrl }) },
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Link", copy_code: plUrl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxPl.message, { messageId: msxPl.key.id });
        }catch(e){await reply(`❌ ytplaylist: ${e.message}`);}
        break;
      }

      case "yttrend": {
        const region=(args[0]?.toUpperCase())||"US";
        try{
          const d=await invGet(`/api/v1/trending?region=${region}&type=music`)||await invGet(`/api/v1/trending?region=${region}`);
          if(!d?.length){await reply("❌ Could not fetch trending videos.");break;}
          const trendTxt=`🔥 *Trending on YouTube (${region})*\n━━━━━━━━━━━━━━━━━━━\n`+
            d.slice(0,5).map((v,i)=>
              `${i+1}. *${v.title}*\n   👤 ${v.author} · 👁 ${fmtNum(v.viewCount)} · ⏱ ${fmtDur(v.lengthSeconds)}\n   🔗 https://youtu.be/${v.videoId}`
            ).join("\n\n");
          const trendUrl = `https://www.youtube.com/feed/trending?gl=${region}`;
          const msxTrd = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: trendTxt },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "🔥 YouTube Trending", url: trendUrl, merchant_url: trendUrl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxTrd.message, { messageId: msxTrd.key.id });
        }catch(e){await reply(`❌ yttrend: ${e.message}`);}
        break;
      }

      case "ytcomments": {
        const u=args[0]?.trim();if(!u){await reply(`Usage: ${prefix}ytcomments <YouTube URL>`);break;}
        const vid=extractVid(u);if(!vid){await reply("❌ Could not extract video ID.");break;}
        try{
          const d=await invGet(`/api/v1/comments/${vid}?sort_by=top`);
          if(!d?.comments?.length){await reply("❌ No comments found.");break;}
          const top5=d.comments.slice(0,5).map((c,i)=>
            `${i+1}. *${c.author}*\n   ${c.content?.slice(0,120)}${(c.content?.length||0)>120?"...":""}\n   👍 ${fmtNum(c.likeCount)}`
          ).join("\n\n");
          const videoUrl = `https://youtu.be/${vid}`;
          const msxCmt = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: `💬 *Top Comments*\n━━━━━━━━━━━━━━━━━━━\n${top5}` },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "▶️ Watch Video", url: videoUrl, merchant_url: videoUrl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxCmt.message, { messageId: msxCmt.key.id });
        }catch(e){await reply(`❌ ytcomments: ${e.message}`);}
        break;
      }

      case "ytlive": {
        const u=args[0]?.trim();if(!u){await reply(`Usage: ${prefix}ytlive <YouTube video or channel URL>`);break;}
        const vid=extractVid(u);if(!vid){await reply("❌ Please provide a valid YouTube video URL.");break;}
        try{
          const info=await ytdl.getInfo(u);const d=info.videoDetails;
          const isLive=d.isLive||d.isLiveContent;
          const status=isLive
            ? `🔴 *LIVE NOW*\n👁️ Watching: ${fmtNum(d.viewCount)}`
            : d.isLiveContent
              ? "⚫ Stream ended"
              : "⚫ Not a live stream";
          const liveText = `📡 *${d.title}*\n━━━━━━━━━━━━━━━━━━━\n`+
            `${status}\n`+
            `👤 *Channel:* ${d.author.name}\n`+
            `🔗 ${d.video_url}`;
          const msxLive = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: liveText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: isLive ? "🔴 Watch Live" : "▶️ Watch Video", url: d.video_url, merchant_url: d.video_url }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxLive.message, { messageId: msxLive.key.id });
        }catch(e){await reply(`❌ ytlive: ${e.message}`);}
        break;
      }

      case "ytsub": {
        const u=args[0]?.trim();if(!u){await reply(`Usage: ${prefix}ytsub <YouTube video URL>`);break;}
        try{
          const info=await ytdl.getInfo(u);const d=info.videoDetails;
          const subs=d.author?.subscriberCount;
          const chanUrl = d.author.channel_url??`https://www.youtube.com/channel/${d.author.id}`;
          const subText = `📊 *Channel Stats*\n━━━━━━━━━━━━━━━━━━━\n`+
            `👤 *Channel:* ${d.author.name}\n`+
            `🔔 *Subscribers:* ${subs?fmtNum(subs):"Hidden"}\n`+
            `🔗 ${chanUrl}`;
          const msxSub = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: subText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📺 Open Channel", url: chanUrl, merchant_url: chanUrl }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxSub.message, { messageId: msxSub.key.id });
        }catch(e){await reply(`❌ ytsub: ${e.message}`);}
        break;
      }

      case "ytlike": {
        const u=args[0]?.trim();if(!u){await reply(`Usage: ${prefix}ytlike <YouTube video URL>`);break;}
        try{
          const info=await ytdl.getInfo(u);const d=info.videoDetails;
          const likeText = `👍 *Video Stats*\n━━━━━━━━━━━━━━━━━━━\n`+
            `📹 *${d.title}*\n`+
            `👍 *Likes:* ${d.likes?fmtNum(d.likes):"Hidden"}\n`+
            `👁️ *Views:* ${fmtNum(d.viewCount)}\n`+
            `🔗 ${d.video_url}`;
          const msxLike = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: likeText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "▶️ Watch Video", url: d.video_url, merchant_url: d.video_url }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxLike.message, { messageId: msxLike.key.id });
        }catch(e){await reply(`❌ ytlike: ${e.message}`);}
        break;
      }


      // ══════════════════════════════════════════════════════════════
      //  . MERGED COMMANDS — All commands ported to ESM English
      // ══════════════════════════════════════════════════════════════

      // ── Limit system helpers ─────────────────────────────────────
      case "mylimit": {
        initUserDB(sender, pushname);
        const lim = checkLimit(sender, isOwner(sender));
        if (lim === "∞") return reply("💎 You have *unlimited* limit as owner!");
        await reply(`📊 *Your Remaining Limit*\n\n💳 Daily limit: *${lim}*\n\n> Limit resets every day at midnight.`);
        break;
      }
      case "setlimit":
      case "caselimit": {
        if (!isOwner(sender)) return reply("❌ Owner only.");
        if (!args[0] || !args[1]) return reply(`Usage: ${prefix}setlimit <command> <cost>\nExample: ${prefix}setlimit tiktok 2`);
        setLimitCost(args[0], parseInt(args[1]) || 0);
        await reply(`✅ Set limit cost for *${args[0]}* to *${args[1]}*`);
        break;
      }

      // ── TikTok Downloader (. engine) ───────────────────────
      case "tt": {
        if (!text) return reply(`📌 Example: ${prefix}tiktok https://vt.tiktok.com/...`);
        initUserDB(sender, pushname);
        const ttCost = getLimitCost("tiktok", 2);
        const ttLim = checkLimit(sender, isOwner(sender));
        if (ttLim !== "∞" && ttLim < ttCost) return reply(`❌ Not enough limit! Need *${ttCost}*, you have *${ttLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const data = await tiktokDl(text);
          if (!data?.status) throw new Error("Failed to fetch data.");
          const author = data.author?.nickname || "Unknown";
          const title = data.title || "-";
          const stats = data.stats || {};
          const images = data.data.filter((v) => v.type === "photo");
          const videoObj = data.data.find((v) => v.type === "nowatermark") || data.data[0];
          const caption = `🎵 *TikTok Downloader*\n\n👤 *Author:* ${author}\n📝 *Title:* ${title}\n\n📊 Views: ${stats.views} | ❤️ ${stats.likes} | 💬 ${stats.comment} | 🔄 ${stats.share}`;

          if (images.length > 0) {
            const cards = await Promise.all(images.slice(0, 10).map(async (v, i) => ({
              header: {
                ...(await prepareWAMessageMedia({ image: { url: v.url } }, { upload: sock.waUploadToServer })),
                title: '',
                subtitle: `Slide ${i + 1}/${images.length}`,
                hasMediaAttachment: true,
              },
              body: { text: '' },
              nativeFlowMessage: { buttons: [] }
            })));
            const carouselMsg = generateWAMessageFromContent(jid, {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  interactiveMessage: {
                    body: { text: caption },
                    carouselMessage: { cards, messageVersion: 1 }
                  }
                }
              }
            }, { quoted: msg });
            await sock.relayMessage(jid, carouselMsg.message, { messageId: carouselMsg.key.id });
          } else if (videoObj?.url) {
            await sock.sendMessage(jid, { video: { url: videoObj.url }, caption }, { quoted: msg });
          }
          // Send audio too
          const audioUrl = data.music_info?.url;
          if (audioUrl) {
            try {
              await sock.sendMessage(jid, {
                audio: { url: audioUrl }, mimetype: "audio/mp4",
                contextInfo: { externalAdReply: { title: data.music_info.title || "TikTok Audio", body: data.music_info.author || "TikTok", mediaType: 1 } },
              }, { quoted: msg });
            } catch {}
          }
          useLimit(sender, ttCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ TikTok download failed: ${e.message}`);
        }
        break;
      }

      case "ttmusic":
      case "tiktokmusic":
      case "tiktokaudio":
      case "ttaudio": {
        if (!text) return reply(`📌 Example: ${prefix}ttmusic https://vt.tiktok.com/...`);
        initUserDB(sender, pushname);
        const ttmCost = getLimitCost("ttmusic", 1);
        const ttmLim = checkLimit(sender, isOwner(sender));
        if (ttmLim !== "∞" && ttmLim < ttmCost) return reply(`❌ Not enough limit! Need *${ttmCost}*, you have *${ttmLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const data = await tiktokDl(text);
          const audioUrl = data.music_info?.url;
          if (!audioUrl) throw new Error("No audio found in this TikTok.");
          await sock.sendMessage(jid, {
            audio: { url: audioUrl }, mimetype: "audio/mp4",
            contextInfo: {
              externalAdReply: {
                title: data.music_info.title || "TikTok Audio",
                body: data.music_info.author || "TikTok",
                thumbnailUrl: data.music_info.cover || "",
                mediaType: 1,
                renderLargerThumbnail: true,
showAdAttribution: false,
              },
            },
          }, { quoted: msg });
          useLimit(sender, ttmCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ TikTok music failed: ${e.message}`);
        }
        break;
      }

      // ── Instagram Downloader (. engine) ────────────────────
      case "instagram":
      case "ig": {
        if (!text) return reply(`📌 Example: ${prefix}igdl https://www.instagram.com/p/...`);
        initUserDB(sender, pushname);
        const igCost = getLimitCost("igdl", 2);
        const igLim = checkLimit(sender, isOwner(sender));
        if (igLim !== "∞" && igLim < igCost) return reply(`❌ Not enough limit! Need *${igCost}*, you have *${igLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const items = await igDl(text);
          if (!items?.length) throw new Error("No media found.");
          // First image item used as preview thumbnail
          const igFirstImg = items.find(it => it.type !== "video")?.url || items[0]?.url || "";
          for (let i = 0; i < Math.min(items.length, 10); i++) {
            const item = items[i];
            const igCtx = i === 0 ? { externalAdReply: { title: "Instagram Downloader", body: `${items.length} media item${items.length > 1 ? "s" : ""} • via Yuzuki MD`, thumbnailUrl: igFirstImg, mediaType: 1, renderLargerThumbnail: false, sourceUrl: text } } : undefined;
            const opts = item.type === "video"
              ? { video: { url: item.url }, caption: i === 0 ? `📸 *Instagram Downloader*\n\nMedia ${i + 1}/${items.length}` : `Media ${i + 1}/${items.length}`, ...(igCtx ? { contextInfo: igCtx } : {}) }
              : { image: { url: item.url }, caption: i === 0 ? `📸 *Instagram Downloader*\n\nMedia ${i + 1}/${items.length}` : `Media ${i + 1}/${items.length}`, ...(igCtx ? { contextInfo: igCtx } : {}) };
            await sock.sendMessage(jid, opts, { quoted: msg });
          }
          useLimit(sender, igCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Instagram download failed: ${e.message}`);
        }
        break;
      }

      // ── YouTube MP3 alias (. engine) ───────────────────────
      case "mp3": {
        if (!text) return reply(`🎵 Usage: ${prefix}mp3 <YouTube URL or song title>\nExample: ${prefix}mp3 Shape of You`);
        initUserDB(sender, pushname);
        const mp3Cost = getLimitCost("ytmp3", 2);
        const mp3Lim = checkLimit(sender, isOwner(sender));
        if (mp3Lim !== "∞" && mp3Lim < mp3Cost) return reply(`❌ Not enough limit! Need *${mp3Cost}*, you have *${mp3Lim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          let done = false;
          // Tier 1: JioSaavn (for song titles, not URLs)
          if (!/^https?:\/\//i.test(text)) {
            try {
              const sv = await searchSaavn(text, 1);
              if (sv.length && sv[0].url) {
                await sock.sendMessage(jid, {
                  audio: { url: sv[0].url }, mimetype: "audio/mpeg",
                  contextInfo: { externalAdReply: { title: sv[0].title, body: sv[0].artists, thumbnailUrl: sv[0].thumbnail || "", mediaType: 1,
                  renderLargerThumbnail: true,
showAdAttribution: false, } },
                }, { quoted: msg });
                done = true;
              }
            } catch {}
          }
          // Tier 2: hub.ytconvert.org
          if (!done) {
            try {
              const result = await ytDlMp3(text);
              await sock.sendMessage(jid, {
                audio: { url: result.downloadUrl }, mimetype: "audio/mp4",
                contextInfo: { externalAdReply: { title: result.title, thumbnailUrl: result.thumbnail || "", mediaType: 1,
                renderLargerThumbnail: true,
showAdAttribution: false, } },
              }, { quoted: msg });
              done = true;
            } catch {}
          }
          // Tier 3: ytdl-core direct
          if (!done) {
            const ytRes = await ytSearchFn(text, 1);
            if (!ytRes.length) throw new Error("No results found.");
            const info = await ytdl.getInfo(ytRes[0].url);
            const fmt = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
            if (!fmt) throw new Error("No audio format available.");
            const chunks = [];
            await new Promise((res, rej) => { const s = ytdl.downloadFromInfo(info, { format: fmt }); s.on("data", c => chunks.push(c)); s.on("end", res); s.on("error", rej); });
            await sock.sendMessage(jid, {
              audio: Buffer.concat(chunks), mimetype: fmt.mimeType?.split(";")[0] || "audio/webm",
              contextInfo: { externalAdReply: { title: info.videoDetails.title, thumbnailUrl: ytRes[0].thumbnail || "", mediaType: 1,
              renderLargerThumbnail: true,
showAdAttribution: false, } },
            }, { quoted: msg });
            done = true;
          }
          if (!done) throw new Error("All sources failed.");
          useLimit(sender, mp3Cost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ MP3 failed: ${e.message}`);
        }
        break;
      }

      case "mp4": {
        if (!text) return reply(`🎬 Usage: ${prefix}mp4 <YouTube URL or video title>\nExample: ${prefix}mp4 Minecraft highlights`);
        initUserDB(sender, pushname);
        const mp4Cost = getLimitCost("ytmp4", 3);
        const mp4Lim = checkLimit(sender, isOwner(sender));
        if (mp4Lim !== "∞" && mp4Lim < mp4Cost) return reply(`❌ Not enough limit! Need *${mp4Cost}*, you have *${mp4Lim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          let done = false;
          // Tier 1: hub.ytconvert.org
          try {
            const result = await ytDlMp4(text, args[1] || "720");
            await sock.sendMessage(jid, { video: { url: result.downloadUrl }, caption: `🎬 *${result.title}*` }, { quoted: msg });
            done = true;
          } catch {}
          // Tier 2: ytdl-core direct
          if (!done) {
            const ytRes = await ytSearchFn(text, 1);
            if (!ytRes.length) throw new Error("No results found.");
            const info = await ytdl.getInfo(ytRes[0].url);
            const dur = parseInt(info.videoDetails.lengthSeconds);
            if (dur > 300) throw new Error("Video too long (max 5 min).");
            const fmt = ytdl.chooseFormat(info.formats, { quality: "lowestvideo", filter: f => f.hasAudio && f.hasVideo });
            if (!fmt) throw new Error("No suitable format.");
            const chunks = [];
            await new Promise((res, rej) => { const s = ytdl.downloadFromInfo(info, { format: fmt }); s.on("data", c => chunks.push(c)); s.on("end", res); s.on("error", rej); });
            const buf = Buffer.concat(chunks);
            if (buf.length > 64 * 1024 * 1024) throw new Error("File too large (>64MB).");
            await sock.sendMessage(jid, { video: buf, caption: `🎬 *${info.videoDetails.title}*`, mimetype: "video/mp4" }, { quoted: msg });
            done = true;
          }
          if (!done) throw new Error("All sources failed.");
          useLimit(sender, mp4Cost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ MP4 failed: ${e.message}`);
        }
        break;
      }

      // ── Spotify ───────────────────────────────────────────────────
      case "spotifydl":
      case "spdl": {
        if (!text) return reply(`📌 Example: ${prefix}spotifydl https://open.spotify.com/track/...`);
        initUserDB(sender, pushname);
        const spCost = getLimitCost("spdl", 2);
        const spLim = checkLimit(sender, isOwner(sender));
        if (spLim !== "∞" && spLim < spCost) return reply(`❌ Not enough limit! Need *${spCost}*, you have *${spLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const sp = await spotifyScrape(text);
          if (!sp.downloadUrl) throw new Error("Download URL not found.");
          await sock.sendMessage(jid, {
            audio: { url: sp.downloadUrl }, mimetype: "audio/mp4",
            contextInfo: { externalAdReply: { title: sp.title, body: sp.artists, thumbnailUrl: sp.thumbnail || "", mediaType: 1,
            renderLargerThumbnail: true,
showAdAttribution: false, } },
          }, { quoted: msg });
          useLimit(sender, spCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Spotify download failed: ${e.message}`);
        }
        break;
      }

      case "spotify":
      case "spotifysearch":
      case "songs": {
        if (!text) return reply(`📌 Example: ${prefix}spotify <song name>`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const results = await searchSpotify(text);
          let out = `🎵 *Spotify Search Results*\n\n`;
          results.slice(0, 10).forEach((t, i) => {
            out += `${i + 1}. *${t.name}*\n   👤 ${t.artists}\n   ⏱️ ${t.duration || "?"} | 🔗 ${t.link}\n\n`;
          });
          const spotifyThumb = results[0]?.thumbnail || results[0]?.image || "";
          const spotifyPayload = await previewCard(out.trim(), {
            title: `🎵 ${results[0]?.name || "Spotify Search"}`,
            body: `👤 ${results[0]?.artists || ""} • ${results.length} results`,
            thumbUrl: spotifyThumb || "https://storage.googleapis.com/pr-newsroom-wp/1/2018/11/Spotify_Logo_RGB_Green.png",
            sourceUrl: results[0]?.link || "https://open.spotify.com",
          });
          await sock.sendMessage(jid, spotifyPayload, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Spotify search failed: ${e.message}`);
        }
        break;
      }

      // ── Pinterest ─────────────────────────────────────────────────
      case "pin": {
        if (!text) return reply(`📌 Usage: ${prefix}pin <search keyword>\nExample: ${prefix}pin aesthetic room`);
        initUserDB(sender, pushname);
        const pinCost = getLimitCost("pinterest", 1);
        const pinLim = checkLimit(sender, isOwner(sender));
        if (pinLim !== "∞" && pinLim < pinCost) return reply(`❌ Not enough limit! Need *${pinCost}*, you have *${pinLim}*.`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const images = await searchPinterestAPI(text, 10);
          if (!images?.length) throw new Error("No images found for that keyword.");
          const cards = await Promise.all(images.slice(0, 10).map(async (item, i) => ({
            header: {
              ...(await prepareWAMessageMedia({ image: { url: item.url } }, { upload: sock.waUploadToServer })),
              title: '',
              subtitle: `Image ${i + 1} of ${images.length}`,
              hasMediaAttachment: true,
            },
            body: { text: item.title ? `📌 ${item.title}` : '' },
            nativeFlowMessage: { buttons: [] }
          })));
          const carouselMsg = generateWAMessageFromContent(jid, {
            viewOnceMessage: {
              message: {
                messageContextInfo: {
                  deviceListMetadata: {},
                  deviceListMetadataVersion: 2,
                },
                interactiveMessage: {
                  body: { text: `📌 *Pinterest Search*\n\n🔎 Query: _${text}_\n📷 ${images.length} results` },
                  carouselMessage: { cards, messageVersion: 1 }
                }
              }
            }
          }, { quoted: msg });
          await sock.relayMessage(jid, carouselMsg.message, { messageId: carouselMsg.key.id });
          useLimit(sender, pinCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Pinterest search failed: ${e.message}`);
        }
        break;
      }

      // ── Dafont ────────────────────────────────────────────────────
      case "dafont":
      case "font":
      case "fontdl":
      case "dafontdl": {
        if (!text) return reply(`📌 Example: ${prefix}dafont arial`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const fonts = await searchDafont(text);
          if (!fonts?.length) throw new Error("No fonts found.");
          let out = `🔤 *DaFont Search: "${text}"*\n\n`;
          fonts.slice(0, 10).forEach((f, i) => {
            out += `${i + 1}. *${f.name}*\n   👤 ${f.author} | 📥 ${f.downloads}\n   🔗 ${f.download}\n\n`;
          });
          await reply(out.trim());
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          await reply(`❌ Dafont search failed: ${e.message}`);
        }
        break;
      }

      // ── Sticker Maker ─────────────────────────────────────────────
      case "stiker":
      case "tosticker": {
        initUserDB(sender, pushname);
        const stkCost = getLimitCost("sticker", 1);
        const stkLim = checkLimit(sender, isOwner(sender));
        if (stkLim !== "∞" && stkLim < stkCost) return reply(`❌ Not enough limit! Need *${stkCost}*, you have *${stkLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const dl = await dlQuoted(msg, jid);
          if (!dl?.buf) return reply("❌ Reply to an image or video to convert to sticker.");
          const webp = await toSticker(dl.buf, "Yuzuki", "Yuzuki Bot");
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
          useLimit(sender, stkCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Sticker failed: ${e.message}`);
        }
        break;
      }

      case "toimage": {
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const dl = await dlQuoted(msg, jid);
          if (!dl?.buf) return reply("❌ Reply to a sticker to convert to image.");
          const { default: sharp } = await import("sharp"); const img = await sharp(dl.buf).png().toBuffer();
          await sock.sendMessage(jid, { image: img, caption: "✅ Converted to image." }, { quoted: msg });
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Conversion failed: ${e.message}`);
        }
        break;
      }

      // ── Brat Sticker ──────────────────────────────────────────────
      case "brat": {
        if (!text) return reply(`📌 Example: ${prefix}brat your text here`);
        initUserDB(sender, pushname);
        const bratCost = getLimitCost("brat", 1);
        const bratLim = checkLimit(sender, isOwner(sender));
        if (bratLim !== "∞" && bratLim < bratCost) return reply(`❌ Not enough limit! Need *${bratCost}*, you have *${bratLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const png = await makeBrat(text);
          const webp = await toSticker(png, "Yuzuki", "Yuzuki Bot");
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
          useLimit(sender, bratCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Brat sticker failed: ${e.message}`);
        }
        break;
      }

      case "bratvid": {
        if (!text) return reply(`📌 Example: ${prefix}bratvid So I wasn't the only one...`);
        initUserDB(sender, pushname);
        const bvCost = getLimitCost("bratvid", 1);
        const bvLim = checkLimit(sender, isOwner(sender));
        if (bvLim !== "∞" && bvLim < bvCost) return reply(`❌ Not enough limit! Need *${bvCost}*, you have *${bvLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const webp = await makeBratVid(text, "Yuzuki", "Yuzuki Bot");
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
          useLimit(sender, bvCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ BratVid sticker failed: ${e.message}`);
        }
        break;
      }

      // ── Quoted Card (QC) ──────────────────────────────────────────
      case "qc":
      case "quoted": {
        if (!text) return reply(`📌 Example: ${prefix}qc your message here`);
        initUserDB(sender, pushname);
        const qcCost = getLimitCost("qc", 1);
        const qcLim = checkLimit(sender, isOwner(sender));
        if (qcLim !== "∞" && qcLim < qcCost) return reply(`❌ Not enough limit! Need *${qcCost}*, you have *${qcLim}*.`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          let ppUrl;
          try { ppUrl = await sock.profilePictureUrl(sender, "image"); } catch { ppUrl = ""; }
          const img = await makeQC(text, pushname || "User", ppUrl || "");
          const webp = await toSticker(img, "Yuzuki", "Yuzuki Bot");
          await sock.sendMessage(jid, { sticker: webp }, { quoted: msg });
          useLimit(sender, qcCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ QC failed: ${e.message}`);
        }
        break;
      }

      case "iqc": {
        if (!text) return reply(`📌 Usage: ${prefix}iqc message|time\nExample: ${prefix}iqc Hello there!|12:00`);
        initUserDB(sender, pushname);
        const iqcCost = getLimitCost("iqc", 1);
        const iqcLim = checkLimit(sender, isOwner(sender));
        if (iqcLim !== "∞" && iqcLim < iqcCost) return reply(`❌ Not enough limit! Need *${iqcCost}*, you have *${iqcLim}*.`);
        const parts = text.split("|").map((s) => s.trim());
        const pesan = parts[0];
        const jam = parts[1] || new Date().toTimeString().slice(0, 5);
        const baterai = parseInt(parts[2]) || 100;
        const sinyal = Math.min(4, Math.max(1, parseInt(parts[3]) || 4));
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const url = `https://brat.siputzx.my.id/iphone-quoted?messageText=${encodeURIComponent(pesan)}&carrierName=CARRIER&batteryPercentage=${baterai}&signalStrength=${sinyal}&time=${encodeURIComponent(jam)}`;
          const { default: axios } = await import("axios");
          const { data } = await axios.get(url, { responseType: "arraybuffer" });
          await sock.sendMessage(jid, { image: Buffer.from(data), caption: "✅ iPhone Quoted Card" }, { quoted: msg });
          useLimit(sender, iqcCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ IQC failed: ${e.message}`);
        }
        break;
      }

      // ── MathGPT AI ────────────────────────────────────────────────
      case "mathgpt":
      case "mtkgpt": {
        if (!text) return reply(`📌 Example: ${prefix}mathgpt What is the derivative of x²?`);
        initUserDB(sender, pushname);
        const mgCost = getLimitCost("mathgpt", 2);
        const mgLim = checkLimit(sender, isOwner(sender));
        if (mgLim !== "∞" && mgLim < mgCost) return reply(`❌ Not enough limit! Need *${mgCost}*, you have *${mgLim}*.`);
        await sock.sendMessage(jid, { react: { text: "🤔", key: msg.key } });
        try {
          let image = null, mime = null, ext = "jpg";
          const dl = await dlQuoted(msg, jid);
          if (dl?.buf) { image = dl.buf; mime = "image/jpeg"; }
          const answer = await mathgpt({ question: text, think: args[0] === "--think", image, mime, ext });
          const mgText = `🧮 *MathGPT*\n\n*Q:* ${text}\n\n*A:* ${answer}`;
          const msxMg = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: mgText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Answer", copy_code: answer }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxMg.message, { messageId: msxMg.key.id });
          useLimit(sender, mgCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ MathGPT error: ${e.message}`);
        }
        break;
      }

      // ── Felo AI ───────────────────────────────────────────────────
      case "felo":
      case "feloai": {
        if (!text) return reply(`📌 Example: ${prefix}felo What is the latest AI news?`);
        initUserDB(sender, pushname);
        const feloCost = getLimitCost("felo", 2);
        const feloLim = checkLimit(sender, isOwner(sender));
        if (feloLim !== "∞" && feloLim < feloCost) return reply(`❌ Not enough limit! Need *${feloCost}*, you have *${feloLim}*.`);
        await sock.sendMessage(jid, { react: { text: "🌐", key: msg.key } });
        try {
          const client = new FeloClient();
          const answer = await client.search(text);
          const answerText = typeof answer === "string" ? answer : JSON.stringify(answer, null, 2);
          const feloFullText = `🌐 *Felo AI Search*\n\n*Q:* ${text}\n\n${answerText}`;
          const msxFelo = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: feloFullText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Answer", copy_code: answerText }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxFelo.message, { messageId: msxFelo.key.id });
          useLimit(sender, feloCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Felo AI error: ${e.message}`);
        }
        break;
      }

      // ── ChatEx AI ─────────────────────────────────────────────────
      case "chatex":
      case "chatexai": {
        if (!text) return reply(`📌 Example: ${prefix}chatex Hello, how are you?`);
        initUserDB(sender, pushname);
        const cxCost = getLimitCost("chatex", 1);
        const cxLim = checkLimit(sender, isOwner(sender));
        if (cxLim !== "∞" && cxLim < cxCost) return reply(`❌ Not enough limit! Need *${cxCost}*, you have *${cxLim}*.`);
        await sock.sendMessage(jid, { react: { text: "💬", key: msg.key } });
        try {
          const answer = await chatex(text);
          const cxFullText = `💬 *ChatEx AI*\n\n*Q:* ${text}\n\n${answer}`;
          const msxCx = generateWAMessageFromContent(jid, {
            viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
              interactiveMessage: {
                body: { text: cxFullText },
                footer: { text: settings.botName ?? "Yuzuki MD" },
                nativeFlowMessage: { buttons: [
                  { name: "cta_copy", buttonParamsJson: JSON.stringify({ display_text: "📋 Copy Response", copy_code: answer }) }
                ]}
              }
            }}
          }, { quoted: msg });
          await sock.relayMessage(jid, msxCx.message, { messageId: msxCx.key.id });
          useLimit(sender, cxCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ ChatEx error: ${e.message}`);
        }
        break;
      }

      // ── Group Protection Tools ────────────────────────────────────
      case "antilinkall":
      case "antilinkgc":
      case "antilinkch":
      case "antilinktt":
      case "antilinkig":
      case "antilinkyt":
      case "antilinkfb":
      case "antilinktw":
      case "antiwame":
      case "antitoxic": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Only bot owner can toggle antilink.");
        const keyMap = {
          antilinkall: "all", antilinkgc: "gc", antilinkch: "ch",
          antilinktt: "tt", antilinkig: "ig", antilinkyt: "yt",
          antilinkfb: "fb", antilinktw: "tw", antiwame: "wame", antitoxic: "toxic",
        };
        const gc = getGroupData(jid);
        const k = keyMap[command];
        gc.antilink[k] = !gc.antilink[k];
        setGroupData(jid, gc);
        await reply(`${gc.antilink[k] ? "✅ Enabled" : "❌ Disabled"} *${command}* for this group.`);
        break;
      }
      case "setantilink": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const valid = ["silent", "warn", "kick"];
        const mode = args[0]?.toLowerCase();
        if (!valid.includes(mode)) return reply(`📌 Usage: ${prefix}setantilink <silent|warn|kick>`);
        const gc = getGroupData(jid);
        gc.antilinkAction = mode;
        setGroupData(jid, gc);
        await reply(`✅ Antilink action set to *${mode}*.`);
        break;
      }
      case "addtoxic":
      case "addbadword": {
        if (!text) return reply(`📌 Usage: ${prefix}addbadword <word>`);
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const bwPath = path.join(DATA_DIR, "badwords.json");
        let bw = [];
        try { bw = JSON.parse(fs.readFileSync(bwPath, "utf8")); } catch {}
        if (!bw.includes(text.toLowerCase())) { bw.push(text.toLowerCase()); fs.writeFileSync(bwPath, JSON.stringify(bw)); }
        await reply(`✅ Added *${text}* to bad words list.`);
        break;
      }
      case "deltoxic":
      case "delbadword": {
        if (!text) return reply(`📌 Usage: ${prefix}delbadword <word>`);
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const bwPath = path.join(DATA_DIR, "badwords.json");
        let bw = [];
        try { bw = JSON.parse(fs.readFileSync(bwPath, "utf8")); } catch {}
        bw = bw.filter((w) => w !== text.toLowerCase());
        fs.writeFileSync(bwPath, JSON.stringify(bw));
        await reply(`✅ Removed *${text}* from bad words list.`);
        break;
      }
      case "listtoxic":
      case "listbadword": {
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const bwPath = "./data/badwords.json";
        let bw = [];
        try { bw = JSON.parse(fs.readFileSync(bwPath, "utf8")); } catch {}
        await reply(bw.length ? `🚫 *Bad Words List (${bw.length}):*\n\n${bw.map((w, i) => `${i + 1}. ${w}`).join("\n")}` : "✅ Bad words list is empty.");
        break;
      }

      // ── Welcome / Left group events (manual toggle) ───────────────
      case "welcome": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const gc = getGroupData(jid);
        gc.welcome = !gc.welcome;
        setGroupData(jid, gc);
        await reply(`${gc.welcome ? "✅ Welcome messages enabled." : "❌ Welcome messages disabled."}`);
        break;
      }
      case "left": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Owner only.");
        const gc = getGroupData(jid);
        gc.left = !gc.left;
        setGroupData(jid, gc);
        await reply(`${gc.left ? "✅ Leave messages enabled." : "❌ Leave messages disabled."}`);
        break;
      }

      // ── Extended group tools (. aliases) ───────────────────
      case "setnamegc": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Owner only.");
        if (!text) return reply(`📌 Usage: ${prefix}setname <new name>`);
        try { await sock.groupUpdateSubject(jid, text); await reply(`✅ Group name updated to *${text}*.`); }
        catch (e) { await reply(`❌ Failed: ${e.message}`); }
        break;
      }
      case "setdescgc": {
        if (!jid.endsWith("@g.us")) return reply("❌ Group only.");
        if (!isOwner(sender)) return reply("❌ Owner only.");
        if (!text) return reply(`📌 Usage: ${prefix}setdesc <new description>`);
        try { await sock.groupUpdateDescription(jid, text); await reply(`✅ Group description updated.`); }
        catch (e) { await reply(`❌ Failed: ${e.message}`); }
        break;
      }
      // ── Bot mode commands (. additions) ────────────────────
      case "onlygc":
      case "onlygroup": {
        if (!isOwner(sender)) return reply("❌ Owner only.");
        setSetting("mode", "group");
        await reply("✅ Bot switched to *Group Only* mode.");
        break;
      }
      case "onlypc":
      case "onlyprivate":
      case "onlypm": {
        if (!isOwner(sender)) return reply("❌ Owner only.");
        setSetting("mode", "private");
        await reply("✅ Bot switched to *Private Only* mode.");
        break;
      }
      
      case "productcard": {
        await sock.sendMessage(msg.key.remoteJid, {
          productMessage: {
            product: {
              productId: "1337",
              title: "Yuzuki MD",
              description: "I'm aizen",
              currencyCode: "USD",
              priceAmount1000: 1000000000,
              retailerId: "yuzuki-v2",
            },
            businessOwnerJid: sock.user.id,
          },
        });
        break;
      }


      // ── .play — search by title, send audio + song list ─────────────
      case "play": {
        if (!text) return reply(`🎵 Usage: ${prefix}play <song title>\nExample: ${prefix}play Blinding Lights`);
        initUserDB(sender, pushname);
        const playCost = getLimitCost("play", 2);
        const playLim = checkLimit(sender, isOwner(sender));
        if (playLim !== "∞" && playLim < playCost) return reply(`❌ Not enough limit! Need *${playCost}*, you have *${playLim}*.`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          let results = [];
          let downloaded = false;

          // ── Tier 1: JioSaavn (320kbps, no key, most reliable) ──────────
          try {
            const saavnRes = await searchSaavn(text, 5);
            if (saavnRes.length && saavnRes[0].url) {
              const top = saavnRes[0];
              await sock.sendMessage(jid, {
                audio: { url: top.url }, mimetype: "audio/mpeg",
                contextInfo: { externalAdReply: {
                  title: top.title,
                  body: `${top.artists}${top.album ? " • " + top.album : ""}`,
                  thumbnailUrl: top.thumbnail || "", mediaType: 1,
                  renderLargerThumbnail: true,
showAdAttribution: false,
                }},
              }, { quoted: msg });
              results = saavnRes.map(s => ({ title: s.title, artists: s.artists, url: s.url }));
              downloaded = true;
            }
          } catch {}

          // ── Tier 2: YouTube search + hub.ytconvert.org converter ────────
          if (!downloaded) {
            try {
              const ytRes = await ytSearchFn(text, 5);
              if (ytRes.length) {
                const dl = await ytDlMp3(ytRes[0].url);
                await sock.sendMessage(jid, {
                  audio: { url: dl.downloadUrl }, mimetype: "audio/mp4",
                  contextInfo: { externalAdReply: {
                    title: dl.title, thumbnailUrl: dl.thumbnail || "", mediaType: 1,
                    renderLargerThumbnail: true,
showAdAttribution: false,
                  }},
                }, { quoted: msg });
                results = ytRes.map(v => ({ title: v.title, artists: v.author, url: v.url }));
                downloaded = true;
              }
            } catch {}
          }

          // ── Tier 3: ytdl-core direct download (final fallback) ──────────
          if (!downloaded) {
            const ytRes = await ytSearchFn(text, 3);
            if (!ytRes.length) throw new Error("No results found for that song.");
            const info = await ytdl.getInfo(ytRes[0].url);
            const fmt = ytdl.chooseFormat(info.formats, { quality: "highestaudio", filter: "audioonly" });
            if (!fmt) throw new Error("No audio format available.");
            const chunks = [];
            await new Promise((res, rej) => {
              const s = ytdl.downloadFromInfo(info, { format: fmt });
              s.on("data", c => chunks.push(c));
              s.on("end", res);
              s.on("error", rej);
            });
            const buf = Buffer.concat(chunks);
            await sock.sendMessage(jid, {
              audio: buf, mimetype: fmt.mimeType?.split(";")[0] || "audio/webm",
              contextInfo: { externalAdReply: {
                title: info.videoDetails.title,
                body: info.videoDetails.author?.name || "",
                thumbnailUrl: ytRes[0].thumbnail || "", mediaType: 1,
                renderLargerThumbnail: true,
showAdAttribution: false,
              }},
            }, { quoted: msg });
            results = ytRes.map(v => ({ title: v.title, artists: v.author, url: v.url }));
            downloaded = true;
          }

          if (!downloaded) throw new Error("All download sources failed. Try again later.");

          // ── Show alternative song list ───────────────────────────────────
if (results.length > 1) {
  const rows = results.slice(0, 5).map((s, i) => ({
    header: "",
    title: `${i + 1}. ${(s.title || "Unknown").slice(0, 40)}`,
    description: `👤 ${(s.artists || "Unknown Artist").slice(0, 50)}`,
    id: `play_${i}`
  }));

  const msgx = generateWAMessageFromContent(jid, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: {
          body: {
            text:
              `🎵 *Song Results for:* _"${text}"_\n\n` +
              `✅ Playing the top result automatically.\n` +
              `📋 Choose another song below if needed.`
          },
          footer: {
            text: "Powered by Yuzuki MD"
          },
          nativeFlowMessage: {
            buttons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "🎵 Choose Song",
                  sections: [
                    {
                      title: "Search Results",
                      rows
                    }
                  ]
                })
              }
            ]
          }
        }
      }
    }
  }, { quoted: msg });

  await sock.relayMessage(
    jid,
    msgx.message,
    { messageId: msgx.key.id }
  );
}

          useLimit(sender, playCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Play failed: ${e.message}`);
        }
        break;
      }

      // ── .pindown — download a specific Pinterest pin URL ─────────────
      case "pindown":
      case "pindl": {
        if (!text || !/pinterest\.com/.test(text)) return reply(`📌 Usage: ${prefix}pindown <Pinterest pin URL>\nExample: ${prefix}pindown https://pinterest.com/pin/12345`);
        await sock.sendMessage(jid, { react: { text: "⏱️", key: msg.key } });
        try {
          const pin = await downloadPinUrl(text);
          if (pin.type === "video") {
            await sock.sendMessage(jid, { video: { url: pin.url }, caption: `📌 *${pin.title}*` }, { quoted: msg });
          } else {
            await sock.sendMessage(jid, { image: { url: pin.url }, caption: `📌 *${pin.title}*` }, { quoted: msg });
          }
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          reply(`❌ Pin download failed: ${e.message}`);
        }
        break;
      }

      // ── .saavn / .music — JioSaavn (free 320kbps download) ──────────
      case "saavn":
      case "jiosaavn":
      case "music": {
        if (!text) return reply(`🎵 Usage: ${prefix}saavn <song title>\nExample: ${prefix}saavn Kesariya`);
        initUserDB(sender, pushname);
        const saavnCost = getLimitCost("saavn", 2);
        const saavnLim = checkLimit(sender, isOwner(sender));
        if (saavnLim !== "∞" && saavnLim < saavnCost) return reply(`❌ Not enough limit! Need *${saavnCost}*, you have *${saavnLim}*.`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const results = await searchSaavn(text, 5);
          if (!results.length) throw new Error("No songs found.");
          const top = results[0];
          if (!top.url) throw new Error("Download URL not available for this song. Try another.");
          await sock.sendMessage(jid, {
            audio: { url: top.url }, mimetype: "audio/mpeg",
            contextInfo: { externalAdReply: {
              title: top.title,
              body: `${top.artists}${top.album ? " • " + top.album : ""}`,
              thumbnailUrl: top.thumbnail || "", mediaType: 1,
              renderLargerThumbnail: true,
showAdAttribution: false,
            }},
          }, { quoted: msg });
          if (results.length > 1) {
            let list = `🎵 *More results for "${text}":*\n\n`;
            results.slice(1).forEach((s, i) => { list += `${i + 2}. *${s.title}* — ${s.artists}\n`; });
            list += `\n💡 Type *${prefix}saavn <exact title>* for a specific song.`;
            await reply(list);
          }
          useLimit(sender, saavnCost, isOwner(sender));
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          await reply(`❌ Saavn failed: ${e.message}`);
        }
        break;
      }

      // ── .deezer — search songs on Deezer (free, no key) ─────────────
      case "deezer": {
        if (!text) return reply(`🎵 Usage: ${prefix}deezer <song name>\nExample: ${prefix}deezer Blinding Lights`);
        await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } });
        try {
          const results = await searchDeezer(text, 8);
          if (!results.length) throw new Error("No results found.");
          let out = `🎵 *Deezer Search: "${text}"*\n${"─".repeat(30)}\n\n`;
          results.forEach((t, i) => {
            const dur = t.duration ? `${Math.floor(t.duration/60)}:${String(t.duration%60).padStart(2,"0")}` : "?";
            out += `*${i+1}.* ${t.title}\n👤 ${t.artists} | 💿 ${t.album || "?"} | ⏱ ${dur}\n\n`;
          });
          out += `💡 Use *${prefix}play <title>* or *${prefix}saavn <title>* to download full songs.`;
          await reply(out.trim());
          await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
        } catch (e) {
          await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
          await reply(`❌ Deezer search failed: ${e.message}`);
        }
        break;
      }

      // ── Bot info / status ─────────────────────────────────────────
      case "infobot":
      case "botstats":
      case "statusbot": {
        const settings = loadSettings();
        const uptime = process.uptime();
        const d = Math.floor(uptime / 86400), h = Math.floor((uptime % 86400) / 3600), m = Math.floor((uptime % 3600) / 60), s = Math.floor(uptime % 60);
        const botInfoText =
          `🤖 *Bot Info*\n━━━━━━━━━━━━━━━━━\n` +
          `📛 Name: *Yuzuki MD*\n` +
          `👑 Owners: *${getOwners().length}*\n` +
          `⏱️ Uptime: *${d}d ${h}h ${m}m ${s}s*\n` +
          `🖥️ Platform: *${process.platform}*\n` +
          `🔧 Node: *${process.version}*\n` +
          `💾 RAM: *${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB*\n` +
          `📂 Mode: *${settings.mode || "public"}*`;
        const msxInfo = generateWAMessageFromContent(jid, {
          viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
            interactiveMessage: {
              body: { text: botInfoText },
              footer: { text: settings.botName ?? "Yuzuki MD" },
              nativeFlowMessage: { buttons: [
                { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "💻 GitHub Repo", url: "https://github.com/KyokaAizen665/Yuzuki-Md-V2", merchant_url: "https://github.com/KyokaAizen665/Yuzuki-Md-V2" }) },
                { name: "cta_url", buttonParamsJson: JSON.stringify({ display_text: "📢 WA Channel", url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326", merchant_url: "https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326" }) }
              ]}
            }
          }}
        }, { quoted: msg });
        await sock.relayMessage(jid, msxInfo.message, { messageId: msxInfo.key.id });
        break;
      }

      // ── Plugin System Stats ────────────────────────────────────────────
      case "pluginstats":
      case "plugins": {
        const stats = getPluginStats();
        await reply(
          `📦 *Plugin System*\n━━━━━━━━━━━━━━━━━\n` +
          `Total Plugins: *${stats.total}*\n` +
          `Categories: *${stats.categories.join(", ")}*\n\n` +
          `_Plugins are loaded dynamically from src/plugins/_`
        );
        break;
      }

      default: {
      // ── Try custom cases first ─────────────────────────────────────────
      const cases = getCases().filter((c) => c.active);
      const match = cases.find((c) => c.command === command);
      if (match) {
        await reply(match.response);
        break;
      }

      // ── Yuzuki Plugin Fallback ──────────────────────────────────────────
      const plugin = getPlugin(command);
      if (plugin) {
        try {
          const m = createMessageObject(msg, { sock, jid, senderJid, pushname, args, command, prefix });
          await plugin.handler(m, { sock });
        } catch (pluginErr) {
          log.err(`Plugin ${command} error: ${pluginErr.message}`);
          await reply(`❌ Plugin *${command}* encountered an error.`);
        }
        break;
      }

      break;
    }
  }
}


/*𝙺𝚒𝚗𝚍𝚕𝚢 𝚐𝚒𝚟𝚎 𝚌𝚛𝚎𝚍𝚒𝚝𝚜 𝚝𝚘 𝚝𝚑𝚎 𝚍𝚎𝚟 
𝗔𝗶𝘇𝗲𝗻 𝙰𝚗𝚍 team ♥ 
𝙲𝚘𝚗𝚝𝚊𝚌𝚝: +233533416608
𝚆𝚊 𝚌𝚑𝚊𝚗𝚗𝚗𝚎𝚕: https://whatsapp.com/channel/0029Vb7eSHf42Dcmdd3XA326*/ 