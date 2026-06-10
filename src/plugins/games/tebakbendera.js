import { games } from '../../lib/games.js'

games.register('tebakbendera', {
    alias: ['tbendera', 'flag'],
    emoji: '🎮',
    title: 'GUESS THE FLAG',
    description: 'Identify the country from its flag',
    hasImage: true,
    imageField: 'img',
    questionField: 'name',
    answerField: 'name',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakbendera')
export { pluginConfig as config, handler, answerHandler }
