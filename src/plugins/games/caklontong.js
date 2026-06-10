import { games } from '../../lib/games.js'

games.register('caklontong', {
    alias: ['cak', 'lontong'],
    emoji: '🎮',
    title: 'WORD RIDDLES',
    description: 'Trick riddles and wordplay — think outside the box',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('caklontong')
export { pluginConfig as config, handler, answerHandler }
