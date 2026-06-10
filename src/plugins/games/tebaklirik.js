import { games } from '../../lib/games.js'

games.register('tebaklirik', {
    alias: ['tlirik', 'lyrics'],
    emoji: '🎮',
    title: 'FILL THE LYRIC',
    description: 'Fill in the missing word from the song lyric',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaklirik')
export { pluginConfig as config, handler, answerHandler }
