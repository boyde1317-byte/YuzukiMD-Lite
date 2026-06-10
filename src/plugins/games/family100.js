import {
  getRandomItem,
  createSession,
  getSession,
  endSession,
  hasActiveSession,
  setSessionTimer,
  getRemainingTime,
  formatRemainingTime,
  isSurrender,
  isReplyToGame,
  getRandomReward,
} from "../../lib/game-data.js";
import { getDatabase } from "../../lib/legacy-compat.js";
import { addExpWithLevelCheck } from "../../lib/legacy-compat.js";

const pluginConfig = {
  name: "family100",
  alias: ["f100", "survey"],
  category: "game",
  description: "Survey says! Guess the top survey answers",
  usage: ".family100",
  example: ".family100",
  isOwner: false,
  isPremium: false,
  isGroup: true,
  isPrivate: false,
  cooldown: 5,
  energi: 0,
  isEnabled: true,
};

async function handler(m, { sock }) {
  const chatId = m.chat;

  if (hasActiveSession(chatId)) {
    const session = getSession(chatId);
    if (session && session.gameType === "family100") {
      const remaining = getRemainingTime(chatId);
      const answered = session.answered || [];
      const total = session.question.jawaban.length;

      let text = `A Family 100 session is already running! 😱✨\n\n`;
      text += `*${session.question.soal}*\n\n`;
      text += `Answered: *${answered.length} of ${total}*\n`;
      answered.forEach((ans, i) => {
        text += `${i + 1}. ✅ ${ans}\n`;
      });
      for (let i = answered.length; i < total; i++) {
        text += `${i + 1}. ❓ ???\n`;
      }
      text += `\nTime left: *${formatRemainingTime(remaining)}* ⏳\n`;
      text += `Hurry up and reply with your answer! 🔥`;
      await m.reply(text);
      return;
    }
  }

  const question = getRandomItem("family100.json");
  if (!question) {
    await m.reply("Sorry, no game data available right now 😭💔");
    return;
  }

  const total = question.jawaban.length;

  let text = `Time to play *FAMILY 100*! 🎉✨\n\n`;
  text += `*Question:* ${question.soal}\n\n`;
  text += `Total Answers: *${total}* 📝\n`;
  for (let i = 0; i < total; i++) {
    text += `${i + 1}. ❓ ???\n`;
  }
  text += `\nYou only have *120 seconds*! ⏱️\n`;
  text += `Rewards? Random *EXP* & *Coins* for every correct answer! 🎁💸\n\n`;
  text += `How to play: *reply to this message* with your answer, or type *surrender* if you give up 🏳️😂`;

  const sentMsg = await m.reply(text);

  const session = createSession(
    chatId,
    "family100",
    question,
    sentMsg.key,
    120000,
  );
  session.answered = [];
  session.answeredBy = {};

  setSessionTimer(chatId, async () => {
    const sess = getSession(chatId);
    const answered = sess?.answered || [];
    const remaining = question.jawaban.filter(
      (j) => !answered.includes(j.toLowerCase()),
    );

    let timeoutText = `Oh no, time's up! 😭😭⏱️\n\n`;
    timeoutText += `You guessed *${answered.length}* out of *${question.jawaban.length}* answers! ✨\n\n`;
    if (remaining.length > 0) {
      timeoutText += `Here are the answers you missed:\n`;
      remaining.forEach((ans) => {
        timeoutText += `• ${ans}\n`;
      });
    }
    timeoutText += `\nThanks for playing — see you next round! 💖🎉`;

    endSession(chatId);
    await sock.sendMessage(chatId, { text: timeoutText }, { quoted: sentMsg });
  });
}

async function family100AnswerHandler(m, sock) {
  const chatId = m.chat;
  const session = getSession(chatId);

  if (!session || session.gameType !== "family100") return false;
  if (!isReplyToGame(m, session)) return false;

  const userAnswer = (m.body || "").toLowerCase().trim();
  if (!userAnswer || userAnswer.startsWith(".")) return false;

  if (isSurrender(userAnswer)) {
    const answered = session.answered || [];
    const remaining = session.question.jawaban.filter(
      (j) => !answered.includes(j.toLowerCase()),
    );

    let text = `Giving up already? 🥺🏳️\n\n`;
    text += `You had already guessed *${answered.length}* out of *${session.question.jawaban.length}*! 👏\n\n`;
    if (remaining.length > 0) {
      text += `Here are the remaining answers:\n`;
      remaining.forEach((ans) => {
        text += `• ${ans}\n`;
      });
    }
    text += `\nNo worries — you'll nail it next time! 💖✨`;

    endSession(chatId);
    await m.reply(text);
    return true;
  }

  const correctAnswers = session.question.jawaban.map((j) => j.toLowerCase());
  const answered = session.answered || [];

  if (answered.includes(userAnswer)) {
    await m.react("⚠️");
    await m.reply(`*${userAnswer}* has already been answered! Try a different one 😂✨`);
    return true;
  }

  const matchIndex = correctAnswers.findIndex((ans) => {
    const similarity = getSimilarity(ans, userAnswer);
    return (
      similarity >= 0.8 || ans.includes(userAnswer) || userAnswer.includes(ans)
    );
  });

  if (matchIndex !== -1) {
    const originalAnswer = session.question.jawaban[matchIndex];

    if (!answered.includes(originalAnswer.toLowerCase())) {
      session.answered.push(originalAnswer.toLowerCase());
      session.answeredBy[originalAnswer.toLowerCase()] = m.sender;

      const db = getDatabase();
      const user = db.getUser(m.sender);

      const answerReward = getRandomReward();
      if (!user.rpg) user.rpg = {};
      await addExpWithLevelCheck(sock, m, db, user, answerReward.exp);
      db.updateKoin(m.sender, answerReward.koin);
      db.save();

      if (session.answered.length === correctAnswers.length) {
        endSession(chatId);

        const participants = Object.values(session.answeredBy);
        const uniqueParticipants = [...new Set(participants)];

        let text = `WOAH AMAZING! All answers guessed! 🎉🔥✨\n\n`;
        text += `*Question:* ${session.question.soal}\n\n`;
        session.question.jawaban.forEach((ans, i) => {
          const who = session.answeredBy[ans.toLowerCase()];
          text += `${i + 1}. ✅ ${ans} - @${who?.split("@")[0] || "?"}\n`;
        });
        text += `\n🎊 Congrats to everyone who played — brilliant minds! 🧠💯`;

        await m.reply(text, { mentions: uniqueParticipants });
        return true;
      }

      const total = session.question.jawaban.length;
      let text = `Correct! ✅🎉\n@${m.sender.split("@")[0]} earned *+${answerReward.exp} EXP* & *+${answerReward.koin} Coins*! 💸✨\n\n`;
      text += `*Question:* ${session.question.soal}\n\n`;
      session.question.jawaban.forEach((ans, i) => {
        const isAnswered = session.answered.includes(ans.toLowerCase());
        if (isAnswered) {
          text += `${i + 1}. ✅ ${ans}\n`;
        } else {
          text += `${i + 1}. ❓ ???\n`;
        }
      });
      text += `\nKeep going — *${total - session.answered.length}* answers left! 🔥⏱️`;

      await m.reply(text, { mentions: [m.sender] });
      return true;
    }
  }

  await m.react("❌");
  await m.reply(`Bzzt! ❌ Wrong! Think harder 😂🧠`);
  return true;
}

function getSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const costs = [];
  for (let i = 0; i <= longer.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= shorter.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (longer.charAt(i - 1) !== shorter.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[shorter.length] = lastValue;
  }

  return (longer.length - costs[shorter.length]) / longer.length;
}

export { pluginConfig as config, handler, family100AnswerHandler };
