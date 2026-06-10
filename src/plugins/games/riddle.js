import { games } from '../../lib/games.js'

games.register('riddle', {
    alias: ['rd', 'tebaktebak', 'riddles'],
    emoji: '🎮',
    title: 'RIDDLE',
    description: 'Classic riddles — can you figure out the answer?',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('riddle')
export { pluginConfig as config, handler, answerHandler }
