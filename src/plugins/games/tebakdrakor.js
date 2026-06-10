import { games } from '../../lib/games.js'

games.register('tebakdrakor', {
    alias: ['drakor', 'kdrama'],
    emoji: '🎮',
    title: 'GUESS THE K-DRAMA',
    description: 'Identify the Korean drama from the description and image',
    hasImage: true,
    imageField: 'img',
    questionField: 'deskripsi',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakdrakor')
export { pluginConfig as config, handler, answerHandler }
