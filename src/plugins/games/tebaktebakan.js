import { games } from '../../lib/games.js'

games.register('tebaktebakan', {
    alias: ['tbt', 'tebak2an', 'riddles2'],
    emoji: '🎮',
    title: 'RIDDLES',
    description: 'Classic trick riddles — what am I?',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaktebakan')
export { pluginConfig as config, handler, answerHandler }
