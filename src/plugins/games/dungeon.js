import { getDatabase } from "../../lib/legacy-compat.js";
import { addExpWithLevelCheck } from "../../lib/legacy-compat.js";
import te from "../../lib/yuzuki-error.js";

const pluginConfig = {
    name: "dungeon",
    alias: ["dg", "explore", "labirin"],
    category: "game",
    description: "Explore the dungeon and fight monsters interactively",
    usage: ".dungeon",
    example: ".dungeon",
    isOwner: false,
    isPremium: false,
    isGroup: false,
    isPrivate: false,
    cooldown: 60,
    energi: 0,
    isEnabled: true,
};

const DUNGEONS = [
    {
        id: 1,
        name: "🌲 Dark Forest",
        levelReq: 1,
        monsters: [
            "Wild Goblin",
            "Giant Slime",
            "Night Wolf",
            "Forest Bandit",
        ],
        minReward: 100,
        maxReward: 300,
        dropChance: 40,
    },
    {
        id: 2,
        name: "🍄 Poison Swamp",
        levelReq: 5,
        monsters: [
            "Mutant Toad",
            "Walking Tree",
            "Poison Spider",
            "Swamp Viper",
        ],
        minReward: 250,
        maxReward: 500,
        dropChance: 45,
    },
    {
        id: 3,
        name: "🏰 Ancient Castle",
        levelReq: 10,
        monsters: [
            "Skull Warrior",
            "Starving Zombie",
            "Restless Ghost",
            "Stone Gargoyle",
        ],
        minReward: 400,
        maxReward: 800,
        dropChance: 50,
    },
    {
        id: 4,
        name: "🏜️ Death Desert",
        levelReq: 15,
        monsters: [
            "Giant Scorpion",
            "Rising Mummy",
            "Desert Worm",
            "Evil Djinn",
        ],
        minReward: 600,
        maxReward: 1200,
        dropChance: 55,
    },
    {
        id: 5,
        name: "🌋 Volcano",
        levelReq: 20,
        monsters: ["Fire Elemental", "Magma Golem", "Young Dragon", "Hellhound"],
        minReward: 900,
        maxReward: 1700,
        dropChance: 60,
    },
    {
        id: 6,
        name: "🧊 Eternal Ice Cave",
        levelReq: 25,
        monsters: ["Ice Golem", "Frost Giant", "Feral Yeti", "Snow Wolf"],
        minReward: 1300,
        maxReward: 2400,
        dropChance: 65,
    },
    {
        id: 7,
        name: "☁️ Sky Ruins",
        levelReq: 30,
        monsters: ["Thunder Harpy", "Wild Griffin", "Fallen Valkyrie", "Wind Golem"],
        minReward: 1800,
        maxReward: 3300,
        dropChance: 70,
    },
    {
        id: 8,
        name: "🌊 Shadow Ocean",
        levelReq: 35,
        monsters: ["Baby Kraken", "Luring Siren", "Ghost Shark", "Red Leviathan"],
        minReward: 2500,
        maxReward: 4500,
        dropChance: 75,
    },
    {
        id: 9,
        name: "🕳️ Void Abyss",
        levelReq: 40,
        monsters: ["Death Angel", "Void Walker", "Shadow Fiend", "Behemoth"],
        minReward: 3500,
        maxReward: 6000,
        dropChance: 80,
    },
    {
        id: 10,
        name: "👹 Deepest Hell",
        levelReq: 50,
        monsters: ["Red Devil", "Deadly Succubus", "Cerberus", "Demon King"],
        minReward: 5000,
        maxReward: 10000,
        dropChance: 90,
    },
];

const LOOT_TABLE = [
    { item: "iron", chance: 40, qty: [1, 5], icon: "⛏️" },
    { item: "gold", chance: 20, qty: [1, 3], icon: "🪙" },
    { item: "diamond", chance: 5, qty: [1, 2], icon: "💎" },
    { item: "potion", chance: 30, qty: [1, 3], icon: "🧪" },
    { item: "herb", chance: 25, qty: [2, 6], icon: "🌿" },
    { item: "leather", chance: 35, qty: [2, 5], icon: "👞" },
    { item: "mysterybox", chance: 3, qty: [1, 1], icon: "📦" },
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

        const session = user.rpg.dungeon_session || null;
        const userLevel = user.level || 1;

        if (session) {
            const SESSION_TIMEOUT = 5 * 60 * 1000;
            if (Date.now() - session.time > SESSION_TIMEOUT) {
                delete user.rpg.dungeon_session;
                db.save();
            } else {
                return m.reply(
                    `⚔️ *DUNGEON SESSION STILL ACTIVE*\n\n` +
                    `You are in the middle of an exploration!\n` +
                    `> Reply to the bot's last message to cancel (type \`cancel\`) or continue (type \`attack\` / \`run\`).`,
                );
            }
        }

        const available = DUNGEONS.filter((d) => userLevel >= d.levelReq);
        if (available.length === 0) {
            return m.reply(
                `❌ *LEVEL TOO LOW*\n\n> Your current level is *${userLevel}*. You need at least level *1* to enter the easiest dungeon.`,
            );
        }

        user.rpg.dungeon_session = {
            stage: "lobi",
            time: Date.now(),
        };
        db.save();

        let txt = `🏰 *DUNGEON LOBBY*\n\n`;
        txt += `📊 *Your Stats:*\n`;
        txt += `> Level: *${userLevel}*\n`;
        txt += `> Stamina: *${user.rpg.stamina ?? 100}/100*\n\n`;
        txt += `Choose a location to explore:\n\n`;

        for (const d of DUNGEONS) {
            if (userLevel >= d.levelReq) {
                txt += `🔓 *${d.id}.* ${d.name} (Lv ${d.levelReq}+)\n`;
            } else {
                txt += `> 🔒 *${d.id}.* ${d.name} (Need Lv ${d.levelReq})\n`;
            }
        }
        txt += `\n> 💡 Reply with the *number* of an unlocked 🔓 location (e.g. \`1\`) or type \`cancel\` to exit.`;

        return m.reply(txt);
    } catch (error) {
        console.error(error);
        m.reply(te(m.prefix, m.command, m.pushName));
    }
}

async function dungeonAnswerHandler(m, sock) {
    if (!m.body || m.isCommand) return false;

    const db = getDatabase();
    const user = db.getUser(m.sender);

    if (!user || !user.rpg || !user.rpg.dungeon_session) return false;

    const session = user.rpg.dungeon_session;
    const SESSION_TIMEOUT = 5 * 60 * 1000;
    if (Date.now() - session.time > SESSION_TIMEOUT) {
        delete user.rpg.dungeon_session;
        db.save();
        await m.reply(
            `⏰ *DUNGEON SESSION EXPIRED*\n\n> Your dungeon session expired due to 5 minutes of inactivity.`,
        );
        return true;
    }

    const text = m.body.trim().toLowerCase();
    const userLevel = user.level || 1;

    if (text === "batal" || text === "cancel" || text === "keluar") {
        delete user.rpg.dungeon_session;
        db.save();
        await m.reply(`🚪 You safely exited the Dungeon Lobby.`);
        return true;
    }

    if (session.stage === "lobi") {
        const choiceId = parseInt(text);
        if (isNaN(choiceId)) return false;

        const dungeon = DUNGEONS.find((d) => d.id === choiceId);

        if (!dungeon) {
            await m.reply(
                `❌ *INVALID CHOICE*\n\n> Dungeon number ${choiceId} not found.`,
            );
            return true;
        }

        if (userLevel < dungeon.levelReq) {
            await m.reply(
                `🔒 *DUNGEON LOCKED*\n\n> Your level (*Lv ${userLevel}*) is not high enough to enter *${dungeon.name}*.\n> You need at least *Lv ${dungeon.levelReq}*.`,
            );
            return true;
        }

        const staminaCost = 30;
        user.rpg.stamina = user.rpg.stamina ?? 100;

        if (user.rpg.stamina < staminaCost) {
            await m.reply(
                `⚡ *NOT ENOUGH STAMINA*\n\n` +
                `You need at least *${staminaCost} stamina* to enter.\n` +
                `Your remaining stamina is only *${user.rpg.stamina}*.\n\n` +
                `> 💡 *Tips:* Use the \`.rest\` command or cancel first (type \`cancel\`).`,
            );
            return true;
        }

        user.rpg.stamina -= staminaCost;
        const monster =
            dungeon.monsters[Math.floor(Math.random() * dungeon.monsters.length)];
        const monsterPower = dungeon.levelReq * 10 + Math.floor(Math.random() * 30);

        user.rpg.dungeon_session = {
            stage: "encounter",
            dungeonId: dungeon.id,
            dungeonName: dungeon.name,
            levelReq: dungeon.levelReq,
            monster: monster,
            monsterPower: monsterPower,
            maxReward: dungeon.maxReward,
            minReward: dungeon.minReward,
            dropChance: dungeon.dropChance,
            time: Date.now(),
        };

        db.save();

        await m.react("🚪");
        let txt = `🚪 *ENTERING DUNGEON*\n\n`;
        txt += `You slowly step into *${dungeon.name}*...\n`;
        txt += `> ⚡ Stamina reduced by *${staminaCost}*\n\n`;
        txt += `Suddenly, a *👹 ${monster}* emerges from the darkness and blocks your path!\n\n`;
        txt += `*⚔️ WHAT WILL YOU DO?*\n`;
        txt += `> Reply \`attack\` to fight\n`;
        txt += `> Reply \`run\` to flee (risky)`;

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
                const goldReward =
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

                user.koin = (user.koin || 0) + goldReward;
                await addExpWithLevelCheck(sock, m, db, user, expReward);

                reportText += `🎉 *GLORIOUS VICTORY!*\n\n`;
                reportText += `With a deadly strike, you slew *${session.monster}*!\n\n`;
                reportText += `*🎁 REWARDS EARNED:*\n`;
                reportText += `> ✨ EXP: *+${Math.floor(expReward)}*\n`;
                reportText += `> 💰 Koin: *+${goldReward.toLocaleString()}*\n`;

                if (droppedItems.length > 0) {
                    reportText += `\n*📦 LOOTED ITEMS:*\n`;
                    reportText += `> ${droppedItems.join("\n> ")}\n`;
                }

                await m.react("🏆");
            } else {
                const goldLoss = Math.floor((user.koin || 0) * 0.15);
                user.koin = Math.max(0, (user.koin || 0) - goldLoss);
                user.rpg.health = Math.max(1, (user.rpg.health || 100) - 40);

                reportText += `💀 *TRAGIC DEFEAT!*\n\n`;
                reportText += `You were outmatched! *${session.monster}* knocked you back hard.\n`;
                reportText += `You managed to crawl out battered and wounded.\n\n`;
                reportText += `*💔 LOSSES:*\n`;
                reportText += `> 💸 Coins dropped: *-${goldLoss.toLocaleString()} Coins*\n`;
                reportText += `> ❤️ Health lost: *-40 HP*\n\n`;
                reportText += `> 💡 *Tips:* Level up, use a potion, or upgrade your weapon!`;

                await m.react("💀");
            }

            delete user.rpg.dungeon_session;
            db.save();
            await m.reply(reportText);
            return true;
        } else if (text === "lari" || text === "kabur" || text === "run") {
            const escapeChance = Math.random() > 0.5;
            let reportText = "";

            if (escapeChance) {
                reportText += `🏃‍♂️ *ESCAPED SUCCESSFULLY!*\n\n`;
                reportText += `You turned and ran as fast as you could. *${session.monster}* lost your trail!\n`;
                reportText += `You escaped unharmed, but the adventure was in vain.`;
                await m.react("💨");
            } else {
                const hpLoss = 25;
                user.rpg.health = Math.max(1, (user.rpg.health || 100) - hpLoss);
                reportText += `💥 *ESCAPE FAILED!*\n\n`;
                reportText += `You tripped on the rocks! *${session.monster}* chased you down and clawed at you!\n\n`;
                reportText += `*💔 KERUGIAN:*\n`;
                reportText += `> ❤️ Darah berkurang: *-${hpLoss} HP*`;
                await m.react("🩸");
            }

            delete user.rpg.dungeon_session;
            db.save();
            await m.reply(reportText);
            return true;
        } else {
            await m.reply(
                `❓ *UNKNOWN COMMAND*\n\n` +
                `> Reply \`attack\` to fight the monster.\n` +
                `> Reply \`run\` to flee.\n` +
                `> Reply \`cancel\` to give up.`,
            );
            return true;
        }
    }

    return false;
}

export { pluginConfig as config, handler, dungeonAnswerHandler };
