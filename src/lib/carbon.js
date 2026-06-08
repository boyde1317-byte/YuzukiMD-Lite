/**
 * Carbon-style Code Screenshot Generator
 *
 * Ported from Yuzuki MD's yuzuki-carbon.js.
 * Converts a code snippet to a dark-themed syntax-highlighted image.
 * Uses @napi-rs/canvas (already in package.json).
 */

let _canvas = null;
async function _getCanvas() {
  if (!_canvas) _canvas = await import("@napi-rs/canvas");
  return _canvas;
}

// ─── Syntax Highlighter ───────────────────────────────────────────────────────

const KEYWORDS = new Set([
  "const", "let", "var", "function", "return", "if", "else", "for", "while",
  "switch", "case", "break", "continue", "true", "false", "null", "undefined",
  "async", "await", "new", "class", "extends", "super", "this", "import",
  "from", "export", "try", "catch", "finally", "throw", "default", "void",
  "typeof", "instanceof", "in", "of", "do", "delete", "yield",
]);

function tokenize(code) {
  const tokens = [];
  const regex =
    /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)|(\b\d+(?:\.\d+)?\b)|([{}\[\](),.;:+\-*/%=<>!&|^~?])|(\b[a-zA-Z_$][a-zA-Z0-9_$]*\b)|(\s+)/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(code)) !== null) {
    if (match.index > lastIndex)
      tokens.push({ text: code.slice(lastIndex, match.index), color: "#D4D4D4" });

    const [full, comment, string, number, symbol, word, space] = match;

    if (comment)       tokens.push({ text: comment, color: "#6A9955" });
    else if (string)   tokens.push({ text: string,  color: "#CE9178" });
    else if (number)   tokens.push({ text: number,  color: "#B5CEA8" });
    else if (symbol)   tokens.push({ text: symbol,  color: "#D4D4D4" });
    else if (word)     tokens.push({ text: word,    color: KEYWORDS.has(word) ? "#569CD6" : "#9CDCFE" });
    else if (space)    tokens.push({ text: space,   color: "#D4D4D4" });
    else               tokens.push({ text: full,    color: "#D4D4D4" });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < code.length)
    tokens.push({ text: code.slice(lastIndex), color: "#D4D4D4" });

  return tokens;
}

// ─── Image Generator ─────────────────────────────────────────────────────────

const FONT_SIZE = 14;
const LINE_HEIGHT = 22;
const PADDING = 40;
const TAB_WIDTH = 4;
const MAX_COLS = 100;

/**
 * Generate a Carbon-like dark themed code image.
 *
 * @param {string} code              — source code string
 * @param {{ lang?, title?, theme? }} opts
 * @returns {Promise<Buffer>}        — PNG buffer
 */
export async function generateCarbon(code, opts = {}) {
  const { createCanvas } = await _getCanvas();
  const { lang = "js", title = "snippet.js", theme = "dark" } = opts;

  // Normalize tabs
  const normalized = code.replace(/\t/g, " ".repeat(TAB_WIDTH));
  const lines = normalized.split("\n");

  // Limit columns for readability
  const clippedLines = lines.map((l) => (l.length > MAX_COLS ? l.slice(0, MAX_COLS) + "…" : l));

  // Measure canvas size
  const tempCanvas = createCanvas(1, 1);
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.font = `${FONT_SIZE}px monospace`;
  const maxLineWidth = Math.max(...clippedLines.map((l) => tempCtx.measureText(l).width));

  const canvasWidth  = Math.ceil(maxLineWidth) + PADDING * 2 + 40; // 40 = line number col
  const canvasHeight = clippedLines.length * LINE_HEIGHT + PADDING * 2 + 50; // 50 = top bar

  const canvas = createCanvas(Math.max(canvasWidth, 400), Math.max(canvasHeight, 200));
  const ctx = canvas.getContext("2d");

  // ── Background ──
  ctx.fillStyle = "#1E1E1E";
  ctx.roundRect?.(0, 0, canvas.width, canvas.height, 12);
  ctx.fill?.();
  if (!ctx.roundRect) {
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Top bar (window controls) ──
  ctx.fillStyle = "#2D2D2D";
  ctx.fillRect(0, 0, canvas.width, 40);

  // Traffic light dots
  [["#FF5F56", 18], ["#FFBD2E", 38], ["#27C93F", 58]].forEach(([c, x]) => {
    ctx.beginPath();
    ctx.arc(x, 20, 6, 0, Math.PI * 2);
    ctx.fillStyle = c;
    ctx.fill();
  });

  // Title
  ctx.font = `bold ${FONT_SIZE}px monospace`;
  ctx.fillStyle = "#CCCCCC";
  ctx.textAlign = "center";
  ctx.fillText(title, canvas.width / 2, 26);
  ctx.textAlign = "left";

  // ── Code area ──
  ctx.font = `${FONT_SIZE}px monospace`;
  const lineNumWidth = 40;

  clippedLines.forEach((line, i) => {
    const y = PADDING + 30 + i * LINE_HEIGHT;

    // Line number
    ctx.fillStyle = "#555555";
    ctx.fillText(String(i + 1).padStart(3, " "), PADDING - 10, y);

    // Tokenize and draw each token
    const tokens = tokenize(line);
    let x = PADDING + lineNumWidth;
    for (const tok of tokens) {
      ctx.fillStyle = tok.color;
      ctx.fillText(tok.text, x, y);
      x += ctx.measureText(tok.text).width;
    }
  });

  return canvas.encode("png");
}
