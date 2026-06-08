/**
 * OTP Card Generator
 * Generates a styled canvas OTP verification card image.
 */

let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}

/**
 * Generate a styled OTP verification card.
 *
 * @param {number} length  — OTP digit count (4-8)
 * @param {{ title?, label?, expireMinutes? }} opts
 * @returns {Promise<{ code: string, buf: Buffer }>}
 */
export async function generateOTPCard(length = 6, opts = {}) {
  const { createCanvas } = await _getCanvas();
  const {
    title          = "Verification Code",
    label          = "User",
    expireMinutes  = 5,
  } = opts;

  // Generate random numeric OTP
  const code = Array.from({ length }, () => Math.floor(Math.random() * 10)).join("");

  const W = 480, H = 260;
  const canvas = createCanvas(W, H);
  const ctx    = canvas.getContext("2d");

  // ── Background ──
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0f0c29");
  bgGrad.addColorStop(0.5, "#302b63");
  bgGrad.addColorStop(1, "#24243e");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── Decorative circles ──
  ctx.beginPath();
  ctx.arc(W - 60, 60, 80, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(60, H - 40, 60, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.03)";
  ctx.fill();

  // ── Top accent bar ──
  const accent = ctx.createLinearGradient(0, 0, W, 0);
  accent.addColorStop(0, "#667eea");
  accent.addColorStop(1, "#764ba2");
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, W, 5);

  // ── Lock icon area ──
  ctx.font = "32px Arial";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("🔐", W / 2, 55);

  // ── Title ──
  ctx.font = "bold 18px Arial";
  ctx.fillStyle = "#E0E0FF";
  ctx.textAlign = "center";
  ctx.fillText(title, W / 2, 85);

  // ── Subtitle / name ──
  ctx.font = "13px Arial";
  ctx.fillStyle = "#9999CC";
  ctx.fillText(`For: ${label}`, W / 2, 108);

  // ── OTP digit boxes ──
  const digitW = 52, digitH = 64;
  const totalWidth = length * digitW + (length - 1) * 10;
  let startX = (W - totalWidth) / 2;
  const digitY = 120;

  for (let i = 0; i < length; i++) {
    const x = startX + i * (digitW + 10);

    // Box background
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.strokeStyle = "rgba(102,126,234,0.6)";
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, digitY, digitW, digitH, 10);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.fillRect(x, digitY, digitW, digitH);
      ctx.strokeRect(x, digitY, digitW, digitH);
    }

    // Digit
    ctx.font = "bold 36px Arial";
    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(code[i], x + digitW / 2, digitY + digitH / 2);
  }
  ctx.textBaseline = "alphabetic";

  // ── Expiry note ──
  ctx.font = "12px Arial";
  ctx.fillStyle = "#FF9F43";
  ctx.textAlign = "center";
  ctx.fillText(`⏱  Expires in ${expireMinutes} minutes  •  Do NOT share`, W / 2, digitY + digitH + 25);

  // ── Bottom separator ──
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(30, digitY + digitH + 40);
  ctx.lineTo(W - 30, digitY + digitH + 40);
  ctx.stroke();

  const buf = await canvas.encode("png");
  return { code, buf };
}
