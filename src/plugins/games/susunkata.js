import { games } from '../../lib/games.js'

games.register('susunkata', {
    alias: ['susun', 'scramble'],
    emoji: '🎮',
    title: 'WORD UNSCRAMBLE',
    description: 'Rearrange the letters to form the correct word',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('susunkata')
export { pluginConfig as config, handler, answerHandler }
