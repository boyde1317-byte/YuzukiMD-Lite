import { games } from '../../lib/games.js'

games.register('tebakjkt48', {
    alias: ['jkt48', 'jkt'],
    emoji: '🎮',
    title: 'GUESS THE JKT48 MEMBER',
    description: 'Identify the JKT48 member from the photo',
    hasImage: true,
    imageField: 'img',
    questionField: 'prompt',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakjkt48')
export { pluginConfig as config, handler, answerHandler }
