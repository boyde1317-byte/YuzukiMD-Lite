
import axios from "axios";
const pluginConfig = {
  name: "githubdl", alias: ["ghdl", "github"], category: "downloader",
  description: "Download GitHub repository as ZIP", usage: ".githubdl <user/repo>",
  example: ".githubdl octocat/Hello-World", isOwner: false, isPremium: false, isGroup: false, isPrivate: false,
  cooldown: 15, isEnabled: true,
};
async function handler(m) {
  const repo = m.text.trim();
  if (!repo || !repo.includes("/")) return m.reply("Usage: .githubdl <user/repo>");
  await m.react("⏳");
  try {
    const url = `https://github.com/${repo}/archive/refs/heads/main.zip`;
    await m.sendMessage(m.from, { document: { url }, mimetype: "application/zip", fileName: `${repo.replace("/","-")}.zip`, caption: `📦 *GitHub Download*\n_${repo}_` });
  } catch {
    m.reply("❌ Failed. Make sure the repo exists and has a main branch.");
  }
}
export { pluginConfig as config, handler };
