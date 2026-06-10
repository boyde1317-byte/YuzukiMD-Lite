import { getDatabase } from "../../lib/legacy-compat.js";
import { addExpWithLevelCheck } from "../../lib/legacy-compat.js";
import te from "../../lib/yuzuki-error.js";

const pluginConfig = {
    name: "kyubigame",
    alias: ["kyubi", "naruto", "shinobi"],
    category: "game",
    description: "Explore the shinobi world and face the strongest ninja enemies",
    usage: ".kyubigame",
    example: ".kyubigame",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true,
};

const LOCATIONS = [
    {
        id: 1,
        name: "🍃 Desa Konoha",
        levelReq: 1,
        monsters: [
            "Rookie Genin",
            "Wild Bandit",
            "Forest Hound",
            "Scout Ninja",
        ],
        minReward: 100,
        maxReward: 300,
        dropChance: 40,
    },
    {
        id: 2,
        name: "🌳 Forest of Death",
        levelReq: 5,
        monsters: [
            "Ninja Otogakure",
            "Giant Tiger",
            "Poison Centipede",
            "Ular Orochimaru",
        ],
        minReward: 250,
        maxReward: 500,
        dropChance: 45,
    },
    {
        id: 3,
        name: "☁️ Lightning Plains",
        levelReq: 10,
        monsters: [
            "Ninja Kumo",
            "Iron Samurai",
            "Thunder Owl",
            "Electric Wolf",
        ],
        minReward: 400,
        maxReward: 800,
        dropChance: 50,
    },
    {
        id: 4,
        name: "🦇 Gua Akatsuki",
        levelReq: 15,
        monsters: [
            "White Zetsu Clone",
            "Poison Bat",
            "Boneka Sasori",
            "Rogue Ninja",
        ],
        minReward: 600,
        maxReward: 1200,
        dropChance: 55,
    },
    {
        id: 5,
        name: "🌊 Lembah Akhir",
        levelReq: 25,
        monsters: [
            "Assassin Ninja",
            "Mizukage Klon",
            "Ghost Uchiha",
            "Golem Statue",
        ],
        minReward: 900,
        maxReward: 1700,
        dropChance: 60,
    },
    {
        id: 6,
        name: "💥 Shinobi Battlefield",
        levelReq: 35,
        monsters: [
            "Giant Zetsu",
            "Edo Tensei Kage",
            "Shinobi Undead",
            "Clone Army",
        ],
        minReward: 1300,
        maxReward: 2400,
        dropChance: 65,
    },
    {
        id: 7,
        name: "🦊 Kurama's Cage",
        levelReq: 50,
        monsters: [
            "Nine-Tails Chakra",
            "Wild Kyubi",
            "Dark Kurama",
            "Bijuu Spirit",
        ],
        minReward: 2500,
        maxReward: 4500,
        dropChance: 75,
    }
];

const LOOT_TABLE = [
    { item: "kunai", chance: 40, qty: [2, 5], icon: "🗡️" },
    { item: "shuriken", chance: 35, qty: [3, 6], icon: "⚔️" },
    { item: "chakra", chance: 30, qty: [1, 3], icon: "🌀" },
    { item: "scroll", chance: 15, qty: [1, 2], icon: "📜" },
    { item: "bowlramen", chance: 20, qty: [1, 2], icon: "🍜" },
];

async function handler(m, { sock }) {
    try {
        const db = getDatabase();
        const user = db.getUser(m.sender);

        if (!user.rpg) user.rpg = {};
        if (!user.rpg.attack) user.rpg.attack = 10;
        if (!user.rpg.health) user.rpg.health = 100;
        if (!user.rpg.maxHealth) user.rpg.maxHealth = 100;
        if (!user.rpg.stamina) user.rpg.stamina = 100;
        if (!user.rpg.maxStamina) user.rpg.maxStamina = 100;
        if (!user.inventory) user.inventory = {};

        const session = user.rpg.kyubigame_session || null;
        const userLevel = user.level || 1;

        if (session) {
            const SESSION_TIMEOUT = 5 * 60 * 1000;
            if (Date.now() - session.time > SESSION_TIMEOUT) {
                delete user.rpg.kyubigame_session;
                db.save();
            } else {
                return m.reply(
                    `⚔️ *SHINOBI MISSION STILL ACTIVE*\n\n` +
                    `You are still in the middle of combat!\n` +
                    `> Reply to the bot's last message (\`attack\` / \`run\`) or cancel the mission (type \`cancel\`).`,
                );
            }
        }

        const available = LOCATIONS.filter((d) => userLevel >= d.levelReq);
        if (available.length === 0) {
            return m.reply(
                `❌ *LEVEL TOO LOW*\n\n> Your current level is *${userLevel}*. You need at least level *1* to begin a shinobi adventure.`,
            );
        }

        user.rpg.kyubigame_session = {
            stage: "lobi",
            time: Date.now(),
        };
        db.save();

        let txt = `⛩️ *SHINOBI LOBBY*\n\n`;
        txt += `📊 *Your Shinobi Stats:*\n`;
        txt += `> Level: *${userLevel}*\n`;
        txt += `> Stamina: *${user.rpg.stamina ?? 100}/100*\n\n`;
        txt += `Choose a mission location to explore:\n\n`;

        for (const d of LOCATIONS) {
            if (userLevel >= d.levelReq) {
                txt += `🔓 *${d.id}.* ${d.name} (Lv ${d.levelReq}+)\n`;
            } else {
                txt += `> 🔒 *${d.id}.* ${d.name} (Need Lv ${d.levelReq})\n`;
            }
        }
        txt += `\n> 💡 Reply with the *number* of a mission location (e.g. \`1\`) or type \`cancel\` to exit.`;

        return m.reply(txt);
    } catch (error) {
        console.error(error);
        m.reply(te(m.prefix, m.command, m.pushName));
    }
}

async function kyubigameAnswerHandler(m, sock) {
    if (!m.body || m.isCommand) return false;

    const db = getDatabase();
    const user = db.getUser(m.sender);

    if (!user || !user.rpg || !user.rpg.kyubigame_session) return false;

    const session = user.rpg.kyubigame_session;
    const SESSION_TIMEOUT = 5 * 60 * 1000;
    if (Date.now() - session.time > SESSION_TIMEOUT) {
        delete user.rpg.kyubigame_session;
        db.save();
        await m.reply(
            `⏰ *MISSION EXPIRED*\n\n> Your shinobi mission session expired due to 5 minutes of inactivity.`,
        );
        return true;
    }

    const text = m.body.trim().toLowerCase();
    const userLevel = user.level || 1;

    if (text === "batal" || text === "cancel" || text === "keluar") {
        delete user.rpg.kyubigame_session;
        db.save();
        await m.reply(`🚪 You successfully cancelled the mission and returned to the village safely.`);
        return true;
    }

    if (session.stage === "lobi") {
        const choiceId = parseInt(text);
        if (isNaN(choiceId)) return false;

        const location = LOCATIONS.find((d) => d.id === choiceId);

        if (!location) {
            await m.reply(
                `❌ *INVALID MISSION*\n\n> Location number ${choiceId} does not exist on the shinobi map.`,
            );
            return true;
        }

        if (userLevel < location.levelReq) {
            await m.reply(
                `🔒 *MISSION LOCKED*\n\n> Your level (*Lv ${userLevel}*) is not high enough to enter *${location.name}*.\n> You need at least *Lv ${location.levelReq}*.`,
            );
            return true;
        }

        const staminaCost = 30;
        user.rpg.stamina = user.rpg.stamina ?? 100;

        if (user.rpg.stamina < staminaCost) {
            await m.reply(
                `⚡ *NOT ENOUGH CHAKRA/STAMINA*\n\n` +
                `You need at least *${staminaCost} stamina* to enter.\n` +
                `Your remaining stamina is only *${user.rpg.stamina}*.\n\n` +
                `> 💡 *Tips:* Use the \`.rest\` command or cancel first (type \`cancel\`).`,
            );
            return true;
        }

        user.rpg.stamina -= staminaCost;
        const monster =
            location.monsters[Math.floor(Math.random() * location.monsters.length)];
        const monsterPower = location.levelReq * 10 + Math.floor(Math.random() * 30);

        user.rpg.kyubigame_session = {
            stage: "encounter",
            locationId: location.id,
            locationName: location.name,
            levelReq: location.levelReq,
            monster: monster,
            monsterPower: monsterPower,
            maxReward: location.maxReward,
            minReward: location.minReward,
            dropChance: location.dropChance,
            time: Date.now(),
        };

        db.save();

        await m.react("⛩️");
        let txt = `⛩️ *ENTERING MISSION AREA*\n\n`;
        txt += `You leap into the depths of *${location.name}*...\n`;
        txt += `> ⚡ Stamina reduced by *${staminaCost}*\n\n`;
        txt += `Suddenly, a *👹 ${monster}* dashes from the shadows and blocks your path!\n\n`;
        txt += `*⚔️ WHAT WILL YOU DO?*\n`;
        txt += `> Reply \`attack\` to fight\n`;
        txt += `> Reply \`run\` to retreat (risky)`;

        await m.reply(txt);
        return true;
    }

    if (session.stage === "encounter") {
        if (text === "serang" || text === "attack" || text === "lawan") {
            const userPower =
                (user.rpg.attack || 10) +
                userLevel * 4 +
                Math.floor(Math.random() * 20);
            const isWin = userPower >= session.monsterPower || Math.random() > 0.4;

            let reportText = "";

            if (isWin) {
                const expReward =
                    150 * (session.levelReq / 2) + Math.floor(Math.random() * 200);
                const ryoReward =
                    Math.floor(Math.random() * (session.maxReward - session.minReward)) +
                    session.minReward;

                const droppedItems = [];
                for (const loot of LOOT_TABLE) {
                    if (Math.random() * 100 < loot.chance * (session.dropChance / 50)) {
                        const qty =
                            Math.floor(Math.random() * (loot.qty[1] - loot.qty[0] + 1)) +
                            loot.qty[0];
                        user.inventory[loot.item] = (user.inventory[loot.item] || 0) + qty;
                        droppedItems.push(`${loot.icon} ${loot.item} (x${qty})`);
                    }
                }

                user.koin = (user.koin || 0) + ryoReward;
                await addExpWithLevelCheck(sock, m, db, user, expReward);

                reportText += `🎉 *MISSION COMPLETE!*\n\n`;
                reportText += `With a deadly jutsu, you defeated *${session.monster}*!\n\n`;
                reportText += `*🎁 MISSION REWARDS:*\n`;
                reportText += `> ✨ EXP: *+${Math.floor(expReward)}*\n`;
                reportText += `> 💰 Ryo (Koin): *+${ryoReward.toLocaleString()}*\n`;

                if (droppedItems.length > 0) {
                    reportText += `\n*📦 SHINOBI LOOT:*\n`;
                    reportText += `> ${droppedItems.join("\n> ")}\n`;
                }

                await m.react("🏆");
            } else {
                const ryoLoss = Math.floor((user.koin || 0) * 0.15);
                user.koin = Math.max(0, (user.koin || 0) - ryoLoss);
                user.rpg.health = Math.max(1, (user.rpg.health || 100) - 40);

                reportText += `💀 *MISSION FAILED!*\n\n`;
                reportText += `You were outmatched! *${session.monster}* knocked you back hard.\n`;
                reportText += `You managed to use a substitution jutsu and crawl out battered and wounded.\n\n`;
                reportText += `*💔 LOSSES:*\n`;
                reportText += `> 💸 Ryo dropped: *-${ryoLoss.toLocaleString()} Ryo*\n`;
                reportText += `> ❤️ Health lost: *-40 HP*\n\n`;
                reportText += `> 💡 *Tips:* Level up, eat some ramen, or strengthen your jutsu!`;

                await m.react("💀");
            }

            delete user.rpg.kyubigame_session;
            db.save();
            await m.reply(reportText);
            return true;
        } else if (text === "lari" || text === "kabur" || text === "run") {
            const escapeChance = Math.random() > 0.5;
            let reportText = "";

            if (escapeChance) {
                reportText += `🏃‍♂️ *ESCAPED SUCCESSFULLY!*\n\n`;
                reportText += `You threw a smoke bomb and fled at full speed. *${session.monster}* lost your trail!\n`;
                reportText += `You escaped unharmed, but the mission was in vain.`;
                await m.react("💨");
            } else {
                const hpLoss = 25;
                user.rpg.health = Math.max(1, (user.rpg.health || 100) - hpLoss);
                reportText += `💥 *ESCAPE FAILED!*\n\n`;
                reportText += `You tripped on a ninja trap! *${session.monster}* chased you down and landed a blow!\n\n`;
                reportText += `*💔 KERUGIAN:*\n`;
                reportText += `> ❤️ Darah berkurang: *-${hpLoss} HP*`;
                await m.react("🩸");
            }

            delete user.rpg.kyubigame_session;
            db.save();
            await m.reply(reportText);
            return true;
        } else {
            await m.reply(
                `❓ *UNKNOWN COMMAND*\n\n` +
                `> Reply \`attack\` to fight the enemy.\n` +
                `> Reply \`run\` to flee.\n` +
                `> Reply \`cancel\` to cancel the mission.`,
            );
            return true;
        }
    }

    return false;
}

export { pluginConfig as config, handler, kyubigameAnswerHandler };
