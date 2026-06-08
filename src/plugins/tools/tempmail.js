
import axios from "axios";
const pluginConfig = {
  name: "tempmail", alias: ["disposablemail"], category: "tools",
  description: "Generate a temporary email address", usage: ".tempmail",
  example: ".tempmail", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 30, isEnabled: true,
};
async function handler(m) {
  await m.react("📧");
  try {
    const { data } = await axios.get("https://www.1secmail.com/api/v1/?action=genRandomMailbox&count=1", { timeout: 10000 });
    const email = data[0];
    m.reply(`╭─〔 📧 *TEMPORARY EMAIL* 〕\n│\n│  📧 *${email}*\n│\n│  Check inbox: .checkmail ${email}\n│\n╰───────────────`);
  } catch {
    m.reply("❌ Failed to generate email. Try again.");
  }
}
export { pluginConfig as config, handler };
