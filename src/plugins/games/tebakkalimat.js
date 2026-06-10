import { games } from '../../lib/games.js'

games.register('tebakkalimat', {
    alias: ['tkl', 'idiom'],
    emoji: '🎮',
    title: 'COMPLETE THE IDIOM',
    description: 'Fill in the missing word to complete the English idiom or proverb',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakkalimat')
export { pluginConfig as config, handler, answerHandler }
