import { games } from '../../lib/games.js'

games.register('tebakgambar', {
    alias: ['tg', 'guessimage'],
    emoji: '🎮',
    title: 'GUESS THE IMAGE',
    description: 'Look at the image and guess the word or phrase',
    hasImage: true,
    imageField: 'img',
    questionField: 'deskripsi',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakgambar')
export { pluginConfig as config, handler, answerHandler }
