import { games } from '../../lib/games.js'

games.register('tebakmakanan', {
    alias: ['makanan', 'food'],
    emoji: '🎮',
    title: 'GUESS THE FOOD',
    description: 'Identify the traditional food from the image',
    hasImage: true,
    imageField: 'img',
    questionField: 'deskripsi',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakmakanan')
export { pluginConfig as config, handler, answerHandler }
