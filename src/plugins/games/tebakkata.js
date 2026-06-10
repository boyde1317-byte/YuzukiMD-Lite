import { games } from '../../lib/games.js'

games.register('tebakkata', {
    alias: ['tk', 'guessword'],
    emoji: '🎮',
    title: 'GUESS THE WORD',
    description: 'Use the clue words to guess the hidden word',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakkata')
export { pluginConfig as config, handler, answerHandler }
