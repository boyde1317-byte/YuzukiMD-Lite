import { games } from '../../lib/games.js'

games.register('tebakkimia', {
    alias: ['kimia', 'chemistry', 'unsur'],
    emoji: '🎮',
    title: 'CHEMISTRY QUIZ',
    description: 'Name the chemical element — guess from the symbol or vice versa',
    questionField: 'unsur',
    answerField: 'lambang',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakkimia')
export { pluginConfig as config, handler, answerHandler }
