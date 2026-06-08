/**
 * Yuzuki MD — Level-Up Notification Cards
 *
 * Ported & enhanced from Yuzuki MD's yuzuki-level.js.
 * Sends a styled canvas card + newsletter-style context when a user levels up.
 */

import { loadSettings } from "../settings.js";
import { sendNewsletterStyle } from "./msg-tricks.js";
import { getProfileBuffer, drawCircleAvatar } from "./profile-picture.js";

let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}

// ─── EXP formula ─────────────────────────────────────────────────────────────

/** XP required to reach a given level */
export function xpForLevel(level) {
  return Math.floor(100 * Math.pow(level, 1.5));
}

/** Compute new level from raw XP total */
export function computeLevel(xp) {
  let level = 0;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

// ─── Canvas level-up card ────────────────────────────────────────────────────

/**
 * Generate a styled level-up card image.
 *
 * @param {{
 *   name:     string,
 *   oldLevel: number,
 *   newLevel: number,
 *   xp:       number,
 *   avatarBuf?: Buffer|null,
 * }} data
 * @returns {Promise<Buffer>} PNG buffer
 */
export async function generateLevelCard(data) {
  const { createCanvas, loadImage } = await _getCanvas();
  const { name, oldLevel, newLevel, xp, avatarBuf = null } = data;

  const W = 600, H = 200;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // ── Background gradient ──
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#1a1a2e");
  grad.addColorStop(1, "#16213e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Glow strip ──
  const glow = ctx.createLinearGradient(0, 0, W, 4);
  glow.addColorStop(0, "#e94560");
  glow.addColorStop(0.5, "#f5a623");
  glow.addColorStop(1, "#e94560");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, 4);

  // ── Avatar ──
  const avatarX = 100, avatarY = H / 2, avatarR = 55;
  if (avatarBuf) {
    await drawCircleAvatar(ctx, avatarBuf, avatarX, avatarY, avatarR, {
      border: 4,
      borderColor: "#f5a623",
    });
  } else {
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarR, 0, Math.PI * 2);
    ctx.fillStyle = "#e94560";
    ctx.fill();
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name.charAt(0).toUpperCase(), avatarX, avatarY);
    ctx.textBaseline = "alphabetic";
  }

  // ── Level-Up Label ──
  ctx.textAlign = "left";
  ctx.font = "bold 13px Arial";
  ctx.fillStyle = "#f5a623";
  ctx.fillText("⬆  LEVEL UP!", 180, 55);

  // ── Name ──
  ctx.font = "bold 26px Arial";
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(name.length > 18 ? name.slice(0, 18) + "…" : name, 180, 90);

  // ── Old → New level ──
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText(`Level ${oldLevel}`, 180, 120);
  ctx.fillStyle = "#f5a623";
  ctx.fillText(` → ${newLevel}`, 180 + ctx.measureText(`Level ${oldLevel}`).width, 120);

  // ── XP bar ──
  const barX = 180, barY = 140, barW = 380, barH = 14;
  const nextXP    = xpForLevel(newLevel + 1);
  const prevXP    = xpForLevel(newLevel);
  const progress  = Math.min((xp - prevXP) / Math.max(nextXP - prevXP, 1), 1);

  // Background
  ctx.fillStyle = "#2D2D4A";
  ctx.beginPath();
  ctx.roundRect?.(barX, barY, barW, barH, 7) || ctx.rect(barX, barY, barW, barH);
  ctx.fill();

  // Fill
  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, "#e94560");
  barGrad.addColorStop(1, "#f5a623");
  ctx.fillStyle = barGrad;
  ctx.beginPath();
  const filled = Math.max(barW * progress, barH); // min width = height for round ends
  ctx.roundRect?.(barX, barY, filled, barH, 7) || ctx.rect(barX, barY, filled, barH);
  ctx.fill();

  // XP label
  ctx.font = "12px Arial";
  ctx.fillStyle = "#AAAAAA";
  ctx.fillText(`${xp - prevXP} / ${nextXP - prevXP} XP`, barX, barY + barH + 16);

  return canvas.encode("png");
}

// ─── Send level-up notification ──────────────────────────────────────────────

/**
 * Add XP to a user and send a level-up card if they levelled up.
 * Drop-in replacement for the basic addExpWithLevelCheck in legacy-compat.js.
 *
 * @param {object} sock
 * @param {{ from, sender, pushName }} m          — message context
 * @param {object} db                              — getDatabase() result
 * @param {object} user                            — db.getUser(sender) result
 * @param {number} amount                          — XP to add
 * @returns {Promise<{ leveled, oldLevel, newLevel }>}
 */
export async function addExpWithCard(sock, m, db, user, amount) {
  const settings = loadSettings();
  const oldLevel = user.level ?? 0;
  user.exp = (user.exp ?? 0) + amount;

  const newLevel = computeLevel(user.exp);
  const leveled  = newLevel > oldLevel;
  user.level = newLevel;

  if (leveled) {
    db.save();

    try {
      // Try to get avatar
      const avatarBuf = await getProfileBuffer(sock, m.sender).catch(() => null);

      // Generate card image
      const cardBuf = await generateLevelCard({
        name:     m.pushName ?? m.sender.split("@")[0],
        oldLevel,
        newLevel,
        xp:       user.exp,
        avatarBuf,
      });

      // Send card with newsletter/forwarded style
      const card = await generateWAMessageFromContent_safe(sock, m.from, cardBuf);

      await sock.sendMessage(m.from, {
        image: cardBuf,
        caption:
          `🎉 *LEVEL UP!*\n` +
          `\n` +
          `👤 *${m.pushName ?? "User"}* just reached *Level ${newLevel}!*\n` +
          `✨ Keep going! Next level in ${xpForLevel(newLevel + 1) - user.exp} XP`,
        contextInfo: {
          isForwarded: true,
          forwardingScore: 999,
          forwardedNewsletterMessageInfo: {
            newsletterJid:  settings.newsletterJid  || "120363400911374213@newsletter",
            newsletterName: settings.newsletterName || settings.botName || "Yuzuki MD",
            serverMessageId: Math.floor(Math.random() * 100) + 1,
          },
        },
      });
    } catch (err) {
      // Fallback: plain text level-up
      await sock.sendMessage(m.from, {
        text:
          `🎉 *LEVEL UP!*\n` +
          `👤 *${m.pushName ?? "User"}* → Level *${newLevel}*!\n` +
          `🏆 Keep grinding!`,
      }).catch(() => {});
    }
  }

  return { leveled, oldLevel, newLevel };
}

// stub to avoid circular imports at module level
async function generateWAMessageFromContent_safe() {}
