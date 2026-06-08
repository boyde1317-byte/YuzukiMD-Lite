/**
 * Carbon Code Screenshot — Plugin
 * Usage: .carbon <code>   or reply to a code message
 */
import { generateCarbon } from "../../lib/carbon.js";

const pluginConfig = {
  name: "carbon",
  alias: ["code2img", "codeshot"],
  category: "tools",
  description: "Convert code to a beautiful syntax-highlighted screenshot",
  usage: ".carbon <code>  (or reply to a code message)",
  example: ".carbon const x = 42; console.log(x);",
  isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 10, isEnabled: true,
};

async function handler(m) {
  let code = m.text.trim();

  // Support replying to a message that contains code
  if (!code && m.quoted?.text) code = m.quoted.text.trim();
  if (!code) return m.reply("Usage: .carbon <code>\nOr reply to a code message with .carbon");

  // Detect language hint from first line
  let lang = "js", title = "code.js";
  const firstLine = code.split("\n")[0].trim();
  if (firstLine.startsWith("//")) {
    const hint = firstLine.slice(2).trim().toLowerCase();
    if (hint.endsWith(".py") || hint === "python") { lang = "py"; title = "code.py"; }
    else if (hint.endsWith(".ts") || hint === "typescript") { lang = "ts"; title = "code.ts"; }
    else if (hint.endsWith(".java") || hint === "java") { lang = "java"; title = "code.java"; }
    else if (hint.endsWith(".cpp") || hint === "cpp" || hint === "c++") { lang = "cpp"; title = "code.cpp"; }
    else if (hint.endsWith(".html") || hint === "html") { lang = "html"; title = "code.html"; }
    else if (hint.endsWith(".css") || hint === "css") { lang = "css"; title = "code.css"; }
    else { title = hint || "code.js"; }
  }

  await m.react("⏳");

  try {
    const buf = await generateCarbon(code, { lang, title });
    await m.sendMessage(m.from, {
      image: buf,
      caption: `💻 *Code Screenshot*\n_${title}_`,
    });
    await m.react("✅");
  } catch (err) {
    await m.react("❌");
    m.reply("❌ Failed to generate code screenshot.");
  }
}

export { pluginConfig as config, handler };
