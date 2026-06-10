import { getDatabase } from "../../lib/legacy-compat.js";
/**
 * 🐺 WEREWOLF GAME
 * Social deduction game for WhatsApp
 *
 * Based on reference: RTXZY-MD-pro/lib/werewolf.js
 * Enhanced for YuzukiAI
 */
import config from "../../config.js";
// fs/path removed — thumbnails now fetched from GitHub Releases URLs
import te from "../../lib/yuzuki-error.js";
const pluginConfig = {
  name: "werewolf",
  alias: ["ww", "wwgc"],
  category: "game",
  description: "Play Werewolf social deduction game with other players",
  usage: ".ww <create|join|start|vote|player|exit|delete>",
  example: ".ww create",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

if (!global.werewolfGames) global.werewolfGames = {};

// Thumbnail images — fetched from GitHub Releases on startup
let thumbWW = null;
let thumbNight = null;
let thumbDay = null;
let thumbWin = null;

const _THUMB = {
  WW:     "https://github.com/boyde1317-byte/YuzukiMD-Lite/releases/download/v1.0-assets/yuzuki-games.jpg",
  NIGHT:  "https://github.com/boyde1317-byte/YuzukiMD-Lite/releases/download/v1.0-assets/yuzuki.png",
  WINNER: "https://github.com/boyde1317-byte/YuzukiMD-Lite/releases/download/v1.0-assets/yuzuki-winner.jpg",
};
(async () => {
  try {
    const fetchBuf = async (url) => Buffer.from(await (await fetch(url)).arrayBuffer());
    thumbWW    = await fetchBuf(_THUMB.WW);
    thumbNight = await fetchBuf(_THUMB.NIGHT);
    thumbDay   = thumbNight;
    thumbWin   = await fetchBuf(_THUMB.WINNER);
    console.log("[WW] Thumbnails loaded from URL");
  } catch (e) {
    console.log("[WW] Failed to fetch thumbnails:", e.message);
  }
})();

const ROLES = {
  werewolf: {
    emoji: "🐺",
    name: "Werewolf",
    team: "wolf",
    desc: "Kill a villager every night",
  },
  seer: {
    emoji: "🔮",
    name: "Seer",
    team: "village",
    desc: "See a player's role every night",
  },
  guardian: {
    emoji: "🛡️",
    name: "Guardian",
    team: "village",
    desc: "Protect a player every night",
  },
  sorcerer: {
    emoji: "🧙",
    name: "Sorcerer",
    team: "wolf",
    desc: "Find out who the Seer is",
  },
  villager: {
    emoji: "👨‍🌾",
    name: "Villager",
    team: "village",
    desc: "Discuss and vote out the werewolf",
  },
};

const WIN_REWARD = { koin: 5000, exp: 1000 };
const MIN_PLAYERS = 4;
const MAX_PLAYERS = 15;
const PHASE_DURATION = {
  night: 60000, // 60 seconds
  day: 90000, // 90 seconds
};

function wwCtx(mentions) {
  const saluranId = config.saluran?.id || "120363400911374213@newsletter";
  const saluranName = config.saluran?.name || config.bot?.name || "Yuzuki-AI";
  return {
    forwardingScore: 9999,
    isForwarded: true,
    mentionedJid: mentions,
    forwardedNewsletterMessageInfo: {
      newsletterJid: saluranId,
      newsletterName: saluranName,
      serverMessageId: 127,
    },
  };
}

async function sendWW(sock, jid, text, title, body, thumbBuffer, mentions) {
  const msgId = await sock.sendPreview(
    jid,
    {
      caption: `${config.info.website} ${text}`,
      url: `${config.info.website}`,
      title: title || "🐺 WEREWOLF",
      description: body || "Social deduction game!",
      jpegThumbnail: thumbBuffer || thumbWW,
      previewType: 0,
    },
    { contextInfo: wwCtx(mentions) },
  );
  return { key: { id: msgId, remoteJid: jid, fromMe: true } };
}

// Generate roles based on player count
function generateRoles(playerCount) {
  const roles = [];

  // Role distribution based on player count (from reference)
  if (playerCount === 4) {
    roles.push("werewolf", "seer", "guardian", "villager");
  } else if (playerCount === 5) {
    roles.push("werewolf", "seer", "guardian", "villager", "villager");
  } else if (playerCount === 6) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "villager",
      "villager",
    );
  } else if (playerCount === 7) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "villager",
      "villager",
      "villager",
    );
  } else if (playerCount === 8) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "villager",
      "villager",
      "villager",
      "villager",
    );
  } else if (playerCount === 9) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "sorcerer",
      "villager",
      "villager",
      "villager",
      "villager",
    );
  } else if (playerCount === 10) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "sorcerer",
      "villager",
      "villager",
      "villager",
      "villager",
      "villager",
    );
  } else if (playerCount === 11) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "guardian",
      "sorcerer",
      "villager",
      "villager",
      "villager",
      "villager",
      "villager",
    );
  } else if (playerCount >= 12) {
    roles.push(
      "werewolf",
      "werewolf",
      "seer",
      "guardian",
      "guardian",
      "sorcerer",
    );
    while (roles.length < playerCount) roles.push("villager");
  }

  // Shuffle roles
  for (let i = roles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [roles[i], roles[j]] = [roles[j], roles[i]];
  }

  return roles;
}

// Get role description for PM
function getRoleDescription(role, prefix = ".") {
  const descriptions = {
    werewolf:
      `🐺 *WEREWOLF*\n\n` +
      `You are a creature of the night!\n\n` +
      `╭┈┈⬡「 📋 *INFO* 」\n` +
      `┃ 🎯 Goal: Kill all Villagers\n` +
      `┃ ⚔️ Skill: Kill 1 player every night\n` +
      `┃ 🕐 Action: Night phase\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> At night, type:\n` +
      `> \`${prefix}wwkill <number>\` in bot PM`,
    seer:
      `🔮 *SEER*\n\n` +
      `You can see the identity of players!\n\n` +
      `╭┈┈⬡「 📋 *INFO* 」\n` +
      `┃ 🎯 Goal: Help the Villagers\n` +
      `┃ 🔮 Skill: See 1 player's role\n` +
      `┃ 🕐 Aksi: Malam hari\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> At night, type:\n` +
      `> \`${prefix}wwsee <number>\` in bot PM`,
    guardian:
      `🛡️ *GUARDIAN*\n\n` +
      `You can protect a player!\n\n` +
      `╭┈┈⬡「 📋 *INFO* 」\n` +
      `┃ 🎯 Goal: Protect a Villager\n` +
      `┃ 🛡️ Skill: Protect 1 player\n` +
      `┃ 🕐 Aksi: Malam hari\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> At night, type:\n` +
      `> \`${prefix}wwprotect <number>\` in bot PM`,
    sorcerer:
      `🧙 *SORCERER*\n\n` +
      `You are an ally of the Werewolf!\n\n` +
      `╭┈┈⬡「 📋 *INFO* 」\n` +
      `┃ 🎯 Goal: Help the Werewolf win\n` +
      `┃ 🔍 Skill: Check if a target is the Seer\n` +
      `┃ 🕐 Aksi: Malam hari\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> At night, type:\n` +
      `> \`${prefix}wwsorcerer <number>\` in bot PM`,
    villager:
      `👨‍🌾 *VILLAGER*\n\n` +
      `You are an ordinary villager!\n\n` +
      `╭┈┈⬡「 📋 *INFO* 」\n` +
      `┃ 🎯 Goal: Find the Werewolf\n` +
      `┃ 🗳️ Skill: Vote during the day\n` +
      `┃ 🕐 Action: Day phase\n` +
      `╰┈┈┈┈┈┈┈┈⬡\n\n` +
      `> Discuss and vote out the werewolf!\n` +
      `> \`${prefix}ww vote <number>\` in the group`,
  };
  return descriptions[role] || "Unknown Role";
}

async function handler(m, { sock }) {
  const db = getDatabase();
  const args = m.args || [];
  const action = args[0]?.toLowerCase();
  const target = args[1];
  const ww = global.werewolfGames;
  const prefix = m.prefix || config.command?.prefix || ".";

  const commands = {
    create: async () => {
      if (ww[m.chat]) {
        const game = ww[m.chat];
        if (game.status === "waiting") {
          return m.reply(
            `❌ *ROOM ALREADY EXISTS*\n\n` +
              `Room is waiting for players\n` +
              `Type \`${prefix}ww join\` to join\n` +
              `Host: @${game.owner.split("@")[0]}`,
            { mentions: [game.owner] },
          );
        }
        return m.reply(`❌ A game is already in progress! Wait until it ends.`);
      }

      // Check if player already in another room
      const existingRoom = Object.entries(ww).find(([chatId, room]) =>
        room.players.some((p) => p.id === m.sender),
      );
      if (existingRoom) {
        return m.reply(`❌ You are still in a game in another group!`);
      }

      // Create new game room
      ww[m.chat] = {
        room: m.chat,
        owner: m.sender,
        status: "waiting",
        day: 0,
        phase: "lobby",
        players: [
          {
            id: m.sender,
            number: 1,
            role: null,
            alive: true,
            voted: false,
            skillUsed: false,
          },
        ],
        dead: [],
        votes: {},
        nightActions: {
          kill: null,
          protect: null,
          see: null,
          sorcerer: null,
        },
        createdAt: Date.now(),
        timeout: null,
      };

      await m.react("🐺");
      await m.reply(
        `🐺 *WEREWOLF GAME*\n\n` +
          `Room created!\n\n` +
          `╭┈┈⬡「 📋 *INFO ROOM* 」\n` +
          `┃ 👑 Host: @${m.sender.split("@")[0]}\n` +
          `┃ 👥 Player: 1/${MAX_PLAYERS}\n` +
          `┃ ⏱️ Min: ${MIN_PLAYERS} player\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `╭┈┈⬡「 🎮 *CARA MAIN* 」\n` +
          `┃ ➕ \`${prefix}ww join\` - Join\n` +
          `┃ ▶️ \`${prefix}ww start\` - Start (host)\n` +
          `┃ 👥 \`${prefix}ww player\` - Player list\n` +
          `┃ 🚪 \`${prefix}ww exit\` - Leave\n` +
          `╰┈┈┈┈┈┈┈┈⬡`,
        { mentions: [m.sender] },
      );
    },

    join: async () => {
      if (!ww[m.chat]) {
        return m.reply(
          `❌ No room found!\n> Type \`${prefix}ww create\` to create a room`,
        );
      }

      if (ww[m.chat].status !== "waiting") {
        return m.reply(`❌ Game already started! Wait for the next round.`);
      }

      if (ww[m.chat].players.length >= MAX_PLAYERS) {
        return m.reply(`❌ Room is full! (Max ${MAX_PLAYERS} players)`);
      }

      if (ww[m.chat].players.some((p) => p.id === m.sender)) {
        return m.reply(`❌ You've already joined!`);
      }

      const existingRoom = Object.entries(ww).find(
        ([chatId, room]) =>
          chatId !== m.chat && room.players.some((p) => p.id === m.sender),
      );
      if (existingRoom) {
        return m.reply(`❌ Kamu masih dalam game di grup lain!`);
      }

      ww[m.chat].players.push({
        id: m.sender,
        number: ww[m.chat].players.length + 1,
        role: null,
        alive: true,
        voted: false,
        skillUsed: false,
      });

      const playerList = ww[m.chat].players
        .map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`)
        .join("\n");

      const canStart = ww[m.chat].players.length >= MIN_PLAYERS;

      await m.react("✅");
      await m.reply(
        `✅ *PLAYER JOINED*\n\n` +
          `@${m.sender.split("@")[0]} joined!\n\n` +
          `╭┈┈⬡「 👥 *PLAYER LIST* 」\n` +
          `${playerList
            .split("\n")
            .map((l) => `┃ ${l}`)
            .join("\n")}\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `Total: ${ww[m.chat].players.length}/${MIN_PLAYERS} (min)\n` +
          (canStart
            ? `✅ Ready to start! \`${prefix}ww start\``
            : `🕕 Need ${MIN_PLAYERS - ww[m.chat].players.length} more player(s)`),
        { mentions: ww[m.chat].players.map((p) => p.id) },
      );
    },

    start: async () => {
      if (!ww[m.chat]) {
        return m.reply(`❌ No room found!`);
      }

      if (ww[m.chat].status !== "waiting") {
        return m.reply(`❌ Game is already running!`);
      }

      if (ww[m.chat].owner !== m.sender && !config.isOwner?.(m.sender)) {
        return m.reply(`❌ Only the host can start the game!`);
      }

      if (ww[m.chat].players.length < MIN_PLAYERS) {
        return m.reply(
          `❌ Need at least ${MIN_PLAYERS} players!\n> Current: ${ww[m.chat].players.length} player(s)`,
        );
      }

      // Generate and assign roles
      const roles = generateRoles(ww[m.chat].players.length);
      ww[m.chat].players.forEach((p, i) => {
        p.role = roles[i];
      });

      ww[m.chat].status = "playing";
      ww[m.chat].day = 1;
      ww[m.chat].phase = "night";

      // Send role to each player via PM
      for (const player of ww[m.chat].players) {
        try {
          await sendWW(
            sock,
            player.id,
            getRoleDescription(player.role, prefix),
            `${ROLES[player.role].emoji} ${ROLES[player.role].name}`,
            "Your role!",
          );
        } catch (e) {
          console.log(`[WW] Failed to send role to ${player.id}:`, e.message);
        }
      }

      // Build player list
      const playerList = ww[m.chat].players
        .map((p, i) => `${i + 1}. @${p.id.split("@")[0]}`)
        .join("\n");

      // Count roles
      const roleCount = {};
      ww[m.chat].players.forEach((p) => {
        roleCount[p.role] = (roleCount[p.role] || 0) + 1;
      });
      const roleInfo = Object.entries(roleCount)
        .map(
          ([role, count]) =>
            `${ROLES[role].emoji} ${ROLES[role].name}: ${count}`,
        )
        .join("\n");

      await m.react("🌙");
      await m.reply(
        `🐺 *GAME STARTED!*\n\n` +
          `🌙 *Night 1*\n\n` +
          `╭┈┈⬡「 👥 *PLAYERS* 」\n` +
          `${playerList
            .split("\n")
            .map((l) => `┃ ${l}`)
            .join("\n")}\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `╭┈┈⬡「 🎭 *ROLES* 」\n` +
          `${roleInfo
            .split("\n")
            .map((l) => `┃ ${l}`)
            .join("\n")}\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `📩 Check your PM for your role!\n` +
          `🌙 Werewolf is hunting...\n` +
          `⏱️ Night duration: ${PHASE_DURATION.night / 1000} seconds`,
        { mentions: ww[m.chat].players.map((p) => p.id) },
      );

      // Send night skill prompts to special roles
      await sendNightPrompts(m.chat, sock, prefix);

      // Set timeout for night phase
      ww[m.chat].timeout = setTimeout(() => {
        processNightActions(m.chat, sock, db, prefix);
      }, PHASE_DURATION.night);
    },

    vote: async () => {
      if (!ww[m.chat] || ww[m.chat].status !== "playing") {
        return m.reply(`❌ No active game!`);
      }

      if (ww[m.chat].phase !== "day") {
        return m.reply(
          `❌ It's not voting time!\n> Phase: ${ww[m.chat].phase === "night" ? "🌙 Night" : ww[m.chat].phase}`,
        );
      }

      const player = ww[m.chat].players.find((p) => p.id === m.sender);
      if (!player) {
        return m.reply(`❌ You are not a player in this game!`);
      }

      if (!player.alive) {
        return m.reply(`❌ You are dead! Cannot vote.`);
      }

      if (player.voted) {
        return m.reply(`❌ You already voted! Wait for the results.`);
      }

      if (!target) {
        const alivePlayers = ww[m.chat].players.filter((p) => p.alive);
        const list = alivePlayers
          .map((p) => `${p.number}. @${p.id.split("@")[0]}`)
          .join("\n");
        return m.reply(
          `🗳️ *VOTING*\n\n` +
            `Choose who to eliminate:\n\n` +
            `${list}\n\n` +
            `Type: \`${prefix}ww vote <number>\``,
          { mentions: alivePlayers.map((p) => p.id) },
        );
      }

      const targetNum = parseInt(target);
      if (isNaN(targetNum)) {
        return m.reply(
          `❌ Enter a player number! Example: \`${prefix}ww vote 2\``,
        );
      }

      const targetPlayer = ww[m.chat].players.find(
        (p) => p.number === targetNum,
      );
      if (!targetPlayer) {
        return m.reply(`❌ Player number ${targetNum} not found!`);
      }

      if (!targetPlayer.alive) {
        return m.reply(`❌ That player is already dead!`);
      }

      player.voted = true;
      ww[m.chat].votes[targetPlayer.id] =
        (ww[m.chat].votes[targetPlayer.id] || 0) + 1;

      const alivePlayers = ww[m.chat].players.filter((p) => p.alive);
      const votedCount = alivePlayers.filter((p) => p.voted).length;

      await m.react("🗳️");
      await m.reply(
        `🗳️ *VOTE RECORDED*\n\n` +
          `@${m.sender.split("@")[0]} ➜ @${targetPlayer.id.split("@")[0]}\n\n` +
          `Progress: ${votedCount}/${alivePlayers.length}`,
        { mentions: [m.sender, targetPlayer.id] },
      );

      // Check if all votes are in
      if (votedCount >= alivePlayers.length) {
        if (ww[m.chat].timeout) clearTimeout(ww[m.chat].timeout);
        await executeVote(m.chat, sock, db, prefix);
      }
    },

    player: async () => {
      if (!ww[m.chat]) {
        return m.reply(`❌ No game in this room!`);
      }

      const playerList = ww[m.chat].players
        .map((p, i) => {
          const status = p.alive
            ? "✅"
            : `☠️ (${ROLES[p.role]?.name || "Unknown"})`;
          return `${p.number}. @${p.id.split("@")[0]} ${status}`;
        })
        .join("\n");

      const phaseEmoji =
        ww[m.chat].phase === "night"
          ? "🌙"
          : ww[m.chat].phase === "day"
            ? "☀️"
            : "🕕";

      await m.reply(
        `🐺 *WEREWOLF - STATUS*\n\n` +
          `╭┈┈⬡「 📊 *GAME INFO* 」\n` +
          `┃ 📅 Day: ${ww[m.chat].day}\n` +
          `┃ ${phaseEmoji} Phase: ${ww[m.chat].phase}\n` +
          `┃ 👤 Alive: ${ww[m.chat].players.filter((p) => p.alive).length}\n` +
          `┃ ☠️ Dead: ${ww[m.chat].dead.length}\n` +
          `╰┈┈┈┈┈┈┈┈⬡\n\n` +
          `╭┈┈⬡「 👥 *PLAYERS* 」\n` +
          `${playerList
            .split("\n")
            .map((l) => `┃ ${l}`)
            .join("\n")}\n` +
          `╰┈┈┈┈┈┈┈┈⬡`,
        { mentions: ww[m.chat].players.map((p) => p.id) },
      );
    },

    exit: async () => {
      if (!ww[m.chat]) {
        return m.reply(`❌ Tidak ada game di room ini!`);
      }

      const playerIdx = ww[m.chat].players.findIndex((p) => p.id === m.sender);
      if (playerIdx === -1) {
        return m.reply(`❌ You are not in this game!`);
      }

      if (ww[m.chat].status === "playing") {
        return m.reply(`❌ Cannot leave while the game is running!`);
      }

      ww[m.chat].players.splice(playerIdx, 1);
      ww[m.chat].players.forEach((p, i) => (p.number = i + 1));

      if (ww[m.chat].players.length === 0) {
        if (ww[m.chat].timeout) clearTimeout(ww[m.chat].timeout);
        delete ww[m.chat];
        return m.reply(`🗑️ Room deleted because it is empty.`);
      }

      // Transfer host if owner left
      if (ww[m.chat].owner === m.sender && ww[m.chat].players.length > 0) {
        ww[m.chat].owner = ww[m.chat].players[0].id;
        await m.reply(
          `👋 @${m.sender.split("@")[0]} left.\n` +
            `👑 New host: @${ww[m.chat].owner.split("@")[0]}`,
          { mentions: [m.sender, ww[m.chat].owner] },
        );
      } else {
        await m.reply(`👋 @${m.sender.split("@")[0]} left the game.`, {
          mentions: [m.sender],
        });
      }
    },

    delete: async () => {
      if (!ww[m.chat]) {
        return m.reply(`❌ Tidak ada game di room ini!`);
      }

      const isOwner = ww[m.chat].owner === m.sender;
      const isBotOwner = config.isOwner?.(m.sender);

      if (!isOwner && !isBotOwner) {
        return m.reply(`❌ Only the host or bot owner can delete the room!`);
      }

      if (ww[m.chat].timeout) clearTimeout(ww[m.chat].timeout);
      delete ww[m.chat];

      await m.react("🗑️");
      await m.reply(`🗑️ Game deleted!`);
    },
  };

  // Show help if no action
  if (!action || !commands[action]) {
    return m.reply(
      `🐺 *WEREWOLF GAME*\n\n` +
        `A social deduction game to find the Werewolf!\n\n` +
        `╭┈┈⬡「 🎮 *COMMANDS* 」\n` +
        `┃ 🆕 \`${prefix}ww create\` - Create room\n` +
        `┃ ➕ \`${prefix}ww join\` - Join\n` +
        `┃ ▶️ \`${prefix}ww start\` - Start (host)\n` +
        `┃ 🗳️ \`${prefix}ww vote <no>\` - Vote\n` +
        `┃ 👥 \`${prefix}ww player\` - Player list\n` +
        `┃ 🚪 \`${prefix}ww exit\` - Leave\n` +
        `┃ 🗑️ \`${prefix}ww delete\` - Delete room\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `╭┈┈⬡「 🎭 *ROLES* 」\n` +
        `┃ 🐺 Werewolf - Kill villagers\n` +
        `┃ 🧙 Sorcerer - Find the Seer\n` +
        `┃ 🔮 Seer - Reveal roles\n` +
        `┃ 🛡️ Guardian - Protect\n` +
        `┃ 👨‍🌾 Villager - Vote out werewolf\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `Min: ${MIN_PLAYERS} players | Max: ${MAX_PLAYERS} players`,
    );
  }

  try {
    await commands[action]();
  } catch (error) {
    console.error("[WEREWOLF ERROR]", error);
    m.reply(te(m.prefix, m.command, m.pushName));
  }
}

// Send night skill prompts to players
async function sendNightPrompts(chatId, sock, prefix) {
  const ww = global.werewolfGames;
  if (!ww[chatId]) return;

  const game = ww[chatId];
  const alivePlayers = game.players.filter((p) => p.alive);

  // Build player list for prompts
  let playerListNormal = "";
  let playerListWolf = "";

  alivePlayers.forEach((p) => {
    playerListNormal += `(${p.number}) @${p.id.split("@")[0]}\n`;
    const roleTag =
      p.role === "werewolf" || p.role === "sorcerer"
        ? ` [${ROLES[p.role].name}]`
        : "";
    playerListWolf += `(${p.number}) @${p.id.split("@")[0]}${roleTag}\n`;
  });

  const mentions = alivePlayers.map((p) => p.id);

  // Send prompts based on role
  for (const player of alivePlayers) {
    try {
      let text = "";

      switch (player.role) {
        case "werewolf":
          text =
            `🐺 *NIGHT PHASE*\n\n` +
            `Time to hunt! Choose your target:\n\n` +
            `${playerListWolf}\n` +
            `> Type \`${prefix}wwkill <number>\` to kill`;
          break;
        case "seer":
          text =
            `🔮 *NIGHT PHASE*\n\n` +
            `Whose role would you like to see?\n\n` +
            `${playerListNormal}\n` +
            `> Type \`${prefix}wwsee <number>\` to see their role`;
          break;
        case "guardian":
          text =
            `🛡️ *NIGHT PHASE*\n\n` +
            `Who would you like to protect?\n\n` +
            `${playerListNormal}\n` +
            `> Type \`${prefix}wwprotect <number>\` to protect`;
          break;
        case "sorcerer":
          text =
            `🧙 *NIGHT PHASE*\n\n` +
            `Find out who the Seer is!\n\n` +
            `${playerListWolf}\n` +
            `> Type \`${prefix}wwsorcerer <number>\` to investigate`;
          break;
        case "villager":
          text =
            `👨‍🌾 *NIGHT PHASE*\n\n` +
            `As a villager, be careful.\n` +
            `You might be the next target.\n\n` +
            `${playerListNormal}`;
          break;
      }

      if (text) {
        await sendWW(
          sock,
          player.id,
          text,
          "🌙 NIGHT",
          "Use your skill!",
          thumbNight,
          mentions,
        );
      }
    } catch (e) {
      console.log(`[WW] Failed to send prompt to ${player.id}:`, e.message);
    }
  }
}

// Process night actions
async function processNightActions(chatId, sock, db, prefix) {
  const ww = global.werewolfGames;
  if (!ww[chatId] || ww[chatId].phase !== "night") return;

  let killTarget = ww[chatId].nightActions.kill;
  const protectTarget = ww[chatId].nightActions.protect;

  let nightReport = `☀️ *MORNING OF DAY ${ww[chatId].day}*\n\n`;

  // Process kill if not protected
  if (killTarget && killTarget !== protectTarget) {
    const victim = ww[chatId].players.find((p) => p.id === killTarget);
    if (victim && victim.alive) {
      victim.alive = false;
      ww[chatId].dead.push(victim);
      nightReport += `☠️ @${victim.id.split("@")[0]} was found dead!\n`;
      nightReport += `> Role: ${ROLES[victim.role].emoji} ${ROLES[victim.role].name}\n\n`;
    }
  } else if (killTarget && killTarget === protectTarget) {
    nightReport += `🛡️ The Guardian successfully protected their target!\n`;
    nightReport += `> No casualties tonight.\n\n`;
  } else {
    nightReport += `🌅 A peaceful night...\n`;
    nightReport += `> No casualties.\n\n`;
  }

  // Check win condition
  const winner = checkWinner(chatId);
  if (winner) {
    await sendWW(
      sock,
      chatId,
      nightReport,
      "☀️ DAY",
      "The morning has arrived...",
      thumbDay,
      ww[chatId].players.map((p) => p.id),
    );
    await endGame(chatId, sock, db, winner);
    return;
  }

  // Change phase to day
  ww[chatId].phase = "day";
  ww[chatId].votes = {};
  ww[chatId].nightActions = {
    kill: null,
    protect: null,
    see: null,
    sorcerer: null,
  };
  ww[chatId].players.forEach((p) => {
    p.voted = false;
    p.skillUsed = false;
  });

  const alivePlayers = ww[chatId].players.filter((p) => p.alive);
  const playerList = alivePlayers
    .map((p) => `${p.number}. @${p.id.split("@")[0]}`)
    .join("\n");

  nightReport += `╭┈┈⬡「 👥 *ALIVE PLAYERS* 」\n`;
  nightReport += `${playerList
    .split("\n")
    .map((l) => `┃ ${l}`)
    .join("\n")}\n`;
  nightReport += `╰┈┈┈┈┈┈┈┈⬡\n\n`;
  nightReport += `> 🗳️ Time to vote!\n`;
  nightReport += `> Type \`${prefix}ww vote <number>\`\n`;
  nightReport += `> ⏱️ Duration: ${PHASE_DURATION.day / 1000} seconds`;

  await sendWW(
    sock,
    chatId,
    nightReport,
    "☀️ DAY",
    "Voting time!",
    thumbDay,
    ww[chatId].players.map((p) => p.id),
  );

  ww[chatId].timeout = setTimeout(() => {
    executeVote(chatId, sock, db, prefix);
  }, PHASE_DURATION.day);
}

// Execute vote results
async function executeVote(chatId, sock, db, prefix) {
  const ww = global.werewolfGames;
  if (!ww[chatId] || ww[chatId].phase !== "day") return;

  let maxVotes = 0;
  let eliminated = null;
  let isTie = false;

  for (const [playerId, votes] of Object.entries(ww[chatId].votes)) {
    if (votes > maxVotes) {
      maxVotes = votes;
      eliminated = playerId;
      isTie = false;
    } else if (votes === maxVotes && maxVotes > 0) {
      isTie = true;
    }
  }

  let resultText = `⚖️ *VOTING RESULTS*\n\n`;

  if (isTie || maxVotes === 0) {
    resultText += `🤷 No one was eliminated!\n`;
    resultText += `> ${isTie ? "It was a tie!" : "No one voted."}\n\n`;
  } else if (eliminated) {
    const player = ww[chatId].players.find((p) => p.id === eliminated);
    if (player) {
      player.alive = false;
      ww[chatId].dead.push(player);

      resultText += `⚰️ @${eliminated.split("@")[0]} was eliminated!\n`;
      resultText += `> Role: ${ROLES[player.role].emoji} ${ROLES[player.role].name}\n`;
      resultText += `> Votes: ${maxVotes}\n\n`;
    }
  }

  // Check win condition
  const winner = checkWinner(chatId);
  if (winner) {
    await sendWW(
      sock,
      chatId,
      resultText,
      "⚖️ VOTING",
      "Voting results",
      thumbDay,
      eliminated ? [eliminated] : [],
    );
    await endGame(chatId, sock, db, winner);
    return;
  }

  // Change to night phase
  ww[chatId].phase = "night";
  ww[chatId].day++;
  ww[chatId].nightActions = {
    kill: null,
    protect: null,
    see: null,
    sorcerer: null,
  };
  ww[chatId].players.forEach((p) => {
    p.voted = false;
    p.skillUsed = false;
  });

  resultText += `🌙 *NIGHT ${ww[chatId].day}*\n\n`;
  resultText += `> The Werewolf is hunting...\n`;
  resultText += `> Special roles, use your skills in PM!\n`;
  resultText += `> ⏱️ Duration: ${PHASE_DURATION.night / 1000} seconds`;

  await sendWW(
    sock,
    chatId,
    resultText,
    "🌙 NIGHT",
    "Werewolf is hunting...",
    thumbNight,
    eliminated ? [eliminated] : [],
  );

  // Send night prompts
  await sendNightPrompts(chatId, sock, prefix);

  ww[chatId].timeout = setTimeout(() => {
    processNightActions(chatId, sock, db, prefix);
  }, PHASE_DURATION.night);
}

// Check win condition
function checkWinner(chatId) {
  const ww = global.werewolfGames;
  if (!ww[chatId]) return null;

  const alivePlayers = ww[chatId].players.filter((p) => p.alive);
  const wolves = alivePlayers.filter((p) => ROLES[p.role]?.team === "wolf");
  const villagers = alivePlayers.filter(
    (p) => ROLES[p.role]?.team === "village",
  );

  if (wolves.length === 0) return "village";
  if (wolves.length >= villagers.length) return "wolf";

  return null;
}

// End game and give rewards
async function endGame(chatId, sock, db, winner) {
  const ww = global.werewolfGames;
  if (!ww[chatId]) return;

  if (ww[chatId].timeout) clearTimeout(ww[chatId].timeout);

  const winningTeam = winner === "wolf" ? "wolf" : "village";
  const winningPlayers = ww[chatId].players.filter(
    (p) => ROLES[p.role]?.team === winningTeam,
  );

  // Give rewards to winners
  for (const player of winningPlayers) {
    try {
      db.updateKoin(player.id, WIN_REWARD.koin);
      const user = db.getUser(player.id);
      if (user) {
        user.exp = (user.exp || 0) + WIN_REWARD.exp;
        db.setUser(player.id, user);
      }
    } catch (e) {
      console.log(`[WW] Failed to give reward to ${player.id}:`, e.message);
    }
  }

  const allPlayers = ww[chatId].players
    .map((p) => {
      const status = p.alive ? "✅" : "☠️";
      const isWinner = winningPlayers.some((w) => w.id === p.id) ? "🏆" : "";
      return `${status} @${p.id.split("@")[0]} - ${ROLES[p.role].emoji} ${ROLES[p.role].name} ${isWinner}`;
    })
    .join("\n");

  const endText =
    `🎉 *GAME OVER!*\n\n` +
    `${winner === "wolf" ? "🐺 *WEREWOLF WINS!*" : "👨‍🌾 *VILLAGERS WIN!*"}\n\n` +
    `╭┈┈⬡「 👥 *ALL PLAYERS* 」\n` +
    `${allPlayers
      .split("\n")
      .map((l) => `┃ ${l}`)
      .join("\n")}\n` +
    `╰┈┈┈┈┈┈┈┈⬡\n\n` +
    `╭┈┈⬡「 🎁 *REWARDS* 」\n` +
    `┃ 💰 +${WIN_REWARD.koin.toLocaleString()} Koin\n` +
    `┃ ⭐ +${WIN_REWARD.exp.toLocaleString()} EXP\n` +
    `╰┈┈┈┈┈┈┈┈⬡\n\n` +
    `> GG WP! Play again? \`${config.command?.prefix || "."}ww create\``;

  await sendWW(
    sock,
    chatId,
    endText,
    "🏆 GAME OVER",
    `${winner === "wolf" ? "Werewolf" : "Villager"} wins!`,
    thumbWin,
    ww[chatId].players.map((p) => p.id),
  );

  delete ww[chatId];
}

// Night action handler for PM commands
async function nightActionHandler(m, { sock }) {
  const db = getDatabase();
  const ww = global.werewolfGames;
  const prefix = m.prefix || config.command?.prefix || ".";

  // Find the game this player is in
  const chatId = Object.keys(ww).find(
    (id) =>
      ww[id].players.some((p) => p.id === m.sender && p.alive) &&
      ww[id].phase === "night",
  );

  if (!chatId) {
    return m.reply(
      `❌ You are not in a werewolf game or it is not the night phase!`,
    );
  }

  const game = ww[chatId];
  const player = game.players.find((p) => p.id === m.sender);
  if (!player || !player.alive) {
    return m.reply(`❌ You are dead or not a player!`);
  }

  // Check if skill already used
  if (player.skillUsed) {
    return m.reply(`❌ You have already used your skill tonight!`);
  }

  const cmd = m.command?.toLowerCase();
  const targetNum = parseInt(m.args?.[0]);

  if (isNaN(targetNum)) {
    return m.reply(`❌ Enter a target number! Example: \`${prefix}${cmd} 2\``);
  }

  const targetPlayer = game.players.find(
    (p) => p.number === targetNum && p.alive,
  );
  if (!targetPlayer) {
    return m.reply(`❌ Invalid target or already dead!`);
  }

  // Process based on command and role
  if (cmd === "wwkill" && player.role === "werewolf") {
    if (targetPlayer.role === "werewolf" || targetPlayer.role === "sorcerer") {
      return m.reply(`❌ Cannot kill a teammate!`);
    }
    game.nightActions.kill = targetPlayer.id;
    player.skillUsed = true;
    await m.reply(
      `🐺 *TARGET SELECTED*\n\n` +
        `Target: @${targetPlayer.id.split("@")[0]}\n` +
        `> Waiting for night to end...`,
      { mentions: [targetPlayer.id] },
    );
    return true;
  }

  if (cmd === "wwprotect" && player.role === "guardian") {
    game.nightActions.protect = targetPlayer.id;
    player.skillUsed = true;
    await m.reply(
      `🛡️ *TARGET PROTECTED*\n\n` +
        `Protecting: @${targetPlayer.id.split("@")[0]}\n` +
        `> Waiting for night to end...`,
      { mentions: [targetPlayer.id] },
    );
    return true;
  }

  if (cmd === "wwsee" && player.role === "seer") {
    const roleInfo = ROLES[targetPlayer.role];
    player.skillUsed = true;
    await m.reply(
      `🔮 *VISION RESULT*\n\n` +
        `@${targetPlayer.id.split("@")[0]} is:\n` +
        `${roleInfo.emoji} *${roleInfo.name}*\n\n` +
        `> Team: ${roleInfo.team === "wolf" ? "🐺 Wolf" : "👨‍🌾 Village"}`,
      { mentions: [targetPlayer.id] },
    );
    return true;
  }

  if (cmd === "wwsorcerer" && player.role === "sorcerer") {
    const isSeer = targetPlayer.role === "seer";
    player.skillUsed = true;
    await m.reply(
      `🧙 *INVESTIGATION RESULT*\n\n` +
        `@${targetPlayer.id.split("@")[0]}\n` +
        `${isSeer ? "✅ *is the SEER!*" : "❌ *is not the Seer*"}\n\n` +
        `> Keep helping the Werewolf!`,
      { mentions: [targetPlayer.id] },
    );
    return true;
  }

  // Wrong role for command
  return m.reply(
    `❌ You do not have this ability!\n> Your role: ${ROLES[player.role]?.name || "Unknown"}`,
  );
}

export { pluginConfig as config, handler, nightActionHandler, ROLES, sendWW };
