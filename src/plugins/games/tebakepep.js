import { games } from '../../lib/games.js'

games.register('tebakepep', {
    alias: ['tebakff', 'tebakfreefire'],
    emoji: '🎮',
    title: 'GUESS THE FREE FIRE CHARACTER',
    description: 'Identify the Free Fire character from the image and description',
    hasImage: true,
    imageField: 'img',
    questionField: 'deskripsi',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakepep')
export { pluginConfig as config, handler, answerHandler }
