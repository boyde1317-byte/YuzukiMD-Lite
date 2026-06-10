import { games } from '../../lib/games.js'

games.register('tebakhewan', {
    alias: ['th', 'guessanimal'],
    emoji: '🎮',
    title: 'GUESS THE ANIMAL',
    description: 'Read the description and name the animal',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakhewan')
export { pluginConfig as config, handler, answerHandler }
