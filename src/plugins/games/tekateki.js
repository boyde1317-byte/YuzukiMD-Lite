import { games } from '../../lib/games.js'

games.register('tekateki', {
    alias: ['teka'],
    emoji: '🎮',
    title: 'RIDDLE QUIZ',
    description: 'Traditional-style riddles and trick questions',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tekateki')
export { pluginConfig as config, handler, answerHandler }
