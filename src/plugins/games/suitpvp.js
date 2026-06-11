import { getDatabase } from "../../lib/legacy-compat.js"
import config from '../../config.js'
const pluginConfig = {
    name: 'suitpvp',
    alias: ['suit', 'rps', 'janken'],
    category: 'game',
    description: 'Play Rock Paper Scissors against another player',
    usage: '.suit @tag',
    example: '.suit @628xxx',
    isOwner: false,
    isPremium: false,
    isGroup: true,
    isPrivate: false,
    cooldown: 10,
    energi: 0,
    isEnabled: true
}

if (!global.suitGames) global.suitGames = {}

const TIMEOUT = 90000
const WIN_REWARD = 1000

const EMOJI = {
    rock: '✊',
    scissors: '✌️',
    paper: '✋'
}

async function handler(m, { sock }) {
    const db = getDatabase()
    
    const existingRoom = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(m.sender)
    )
    
    if (existingRoom) {
        return m.reply(
            `❌ You're still in a suit game!\n\n` +
            `> Finish your current game first.`
        )
    }
    
    let target = null
    if (m.quoted) {
        target = m.quoted.sender
    } else if (m.mentionedJid?.[0]) {
        target = m.mentionedJid[0]
    }
    
    if (!target) {
        return m.reply(
            `✊✌️✋ *sᴜɪᴛ ᴘᴠᴘ*\n\n` +
            `> Tag the person you want to challenge!\n\n` +
            `*Example:*\n` +
            `> \`.suit @628xxx\``
        )
    }
    
    if (target === m.sender) {
        return m.reply("❌ You can't challenge yourself!")
    }
    
    const targetInGame = Object.values(global.suitGames).find(
        room => [room.p, room.p2].includes(target)
    )
    
    if (targetInGame) {
        return m.reply('❌ That person is already in a suit game!')
    }
    
    const roomId = 'suit_' + Date.now()
    
    global.suitGames[roomId] = {
        id: roomId,
        chat: m.chat,
        p: m.sender,
        p2: target,
        status: 'waiting',
        pilih: null,
        pilih2: null,
        createdAt: Date.now(),
        timeout: setTimeout(() => {
            if (global.suitGames[roomId]) {
                sock.sendMessage(m.chat, {
                    text: `⏱️ *TIMEOUT!*\n\n@${target.split('@')[0]} did not respond!\nSuit cancelled.`,
                    mentions: [target]
                })
                delete global.suitGames[roomId]
            }
        }, TIMEOUT)
    }
    
    await m.react('✊')
    await m.reply(
        `You challenged @${target.split('@')[0]} to a suit match!\n\n` +
        `╭┈┈⬡「 💬 *ʀᴇsᴘᴏɴsᴇ* 」\n` +
        `┃ ✅ Type *accept* / *ok* / *yes*\n` +
        `┃ ❌ Type *decline* / *no*\n` +
        `╰┈┈┈┈┈┈┈┈⬡\n\n` +
        `Time: 90 seconds`,
        { mentions: [target] }
    )
}

async function answerHandler(m, sock) {
    if (!m.body) return false
    
    const text = m.body.trim().toLowerCase()
    const db = getDatabase()
    
    let room = null
    let roomId = null
    
    for (const [id, r] of Object.entries(global.suitGames)) {
        if (r.chat === m.chat && [r.p, r.p2].includes(m.sender)) {
            room = r
            roomId = id
            break
        }
        if (!m.isGroup && [r.p, r.p2].includes(m.sender)) {
            room = r
            roomId = id
            break
        }
    }
    
    if (!room) return false
    
    if (room.status === 'waiting' && m.sender === room.p2 && m.chat === room.chat) {
        if (/^(acc(ept)?|yes|ok|sure|yep|yeah|gas|oke?)$/i.test(text)) {
            clearTimeout(room.timeout)
            room.status = 'playing'
            
            await m.react('🎮')
            
            await m.reply(
                `✊✌️✋ *sᴜɪᴛ sᴛᴀʀᴛᴇᴅ!*\n\n` +
                `@${room.p.split('@')[0]} vs @${room.p2.split('@')[0]}\n\n` +
                `> 📩 Check your *Private Chat* to make your pick!\n` +
                `> ⏱️ Timeout: 90 seconds`,
                { mentions: [room.p, room.p2] }
            )
            
            const pmMessage =
                `✊✌️✋ *sᴜɪᴛ - ᴘɪᴄᴋ ʏᴏᴜʀ ᴄʜᴏɪᴄᴇ*\n\n` +
                `Pick one:\n\n` +
                `┃ ✊ *rock*\n` +
                `┃ ✌️ *scissors*\n` +
                `┃ ✋ *paper*\n\n` +
                `*TIP: Reply to this message with your choice!*\n` +
                `Example: *rock*`
            
            try {
                await sock.sendMessage(room.p, { text: pmMessage })
            } catch (e) {
                console.log('[Suit] Failed to PM player 1:', e.message)
            }
            
            try {
                await sock.sendMessage(room.p2, { text: pmMessage })
            } catch (e) {
                console.log('[Suit] Failed to PM player 2:', e.message)
            }
            
            room.timeout = setTimeout(async () => {
                if (global.suitGames[roomId]) {
                    if (!room.pilih && !room.pilih2) {
                        await sock.sendMessage(room.chat, { 
                            text: '⏱️ Neither player chose — suit cancelled!' 
                        })
                    } else if (!room.pilih || !room.pilih2) {
                        const afk = !room.pilih ? room.p : room.p2
                        const winner = !room.pilih ? room.p2 : room.p
                        
                        db.updateKoin(winner, WIN_REWARD)
                        
                        await sock.sendMessage(room.chat, {
                            text: `⏱️ *TIMEOUT!*\n\n` +
                                `@${afk.split('@')[0]} did not choose!\n` +
                                `@${winner.split('@')[0]} wins! +Rp ${WIN_REWARD.toLocaleString()}`,
                            mentions: [afk, winner]
                        })
                    }
                    delete global.suitGames[roomId]
                }
            }, TIMEOUT)
            
            return true
        }
        
        if (/^(decline|no|nope|cancel|not now|tolak|gamau|nanti|ga(k.)?bisa|tidak)$/i.test(text)) {
            clearTimeout(room.timeout)
            
            await sock.sendMessage(room.chat, {
                text: `❌ @${room.p2.split('@')[0]} declined the challenge!\nSuit cancelled.`,
                mentions: [room.p2]
            })
            
            delete global.suitGames[roomId]
            return true
        }
    }
    
    if (room.status === 'playing' && !m.isGroup) {
        const choices = /^(rock|scissors|paper)$/i
        
        if (!choices.test(text)) return false
        
        const choice = text.toLowerCase()
        
        if (m.sender === room.p && !room.pilih) {
            room.pilih = choice
            await m.reply(`✅ You chose *${choice}* ${EMOJI[choice]}\n\n> Waiting for opponent...`)
            
            if (!room.pilih2) {
                await sock.sendMessage(room.chat, {
                    text: `🕕 @${room.p.split('@')[0]} has chosen!\n> Waiting for @${room.p2.split('@')[0]}...`,
                    mentions: [room.p, room.p2]
                })
            }
        }
        
        if (m.sender === room.p2 && !room.pilih2) {
            room.pilih2 = choice
            await m.reply(`✅ You chose *${choice}* ${EMOJI[choice]}\n\n> Waiting for opponent...`)
            
            if (!room.pilih) {
                await sock.sendMessage(room.chat, {
                    text: `🕕 @${room.p2.split('@')[0]} has chosen!\n> Waiting for @${room.p.split('@')[0]}...`,
                    mentions: [room.p, room.p2]
                })
            }
        }
        
        if (room.pilih && room.pilih2) {
            clearTimeout(room.timeout)
            
            let winner = null
            let tie = false
            
            if (room.pilih === room.pilih2) {
                tie = true
            } else if (
                (room.pilih === 'rock' && room.pilih2 === 'scissors') ||
                (room.pilih === 'scissors' && room.pilih2 === 'paper') ||
                (room.pilih === 'paper' && room.pilih2 === 'rock')
            ) {
                winner = room.p
            } else {
                winner = room.p2
            }
            
            let resultTxt = `✊✌️✋ *sᴜɪᴛ ʀᴇsᴜʟᴛ*\n\n`
            resultTxt += `@${room.p.split('@')[0]} ${EMOJI[room.pilih]} ${room.pilih}\n`
            resultTxt += `@${room.p2.split('@')[0]} ${EMOJI[room.pilih2]} ${room.pilih2}\n\n`
            
            if (tie) {
                resultTxt += `🤝 *TIE!*`
            } else {
                db.updateKoin(winner, WIN_REWARD)
                
                resultTxt += `🏆 @${winner.split('@')[0]} wins!\n`
                resultTxt += `> +Rp ${WIN_REWARD.toLocaleString()}`
            }
            
            await sock.sendMessage(room.chat, {
                text: resultTxt,
                mentions: [room.p, room.p2]
            }, { quoted: m })
            
            delete global.suitGames[roomId]
        }
        
        return true
    }
    
    return false
}

export { pluginConfig as config, handler, answerHandler }
