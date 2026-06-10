import { games } from '../../lib/games.js'

games.register('tebaknegara', {
    alias: ['tn', 'guesscountry'],
    emoji: '🎮',
    title: 'GUESS THE COUNTRY',
    description: 'Read the clue and name the country',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaknegara')
export { pluginConfig as config, handler, answerHandler }
