import { games } from '../../lib/games.js'

games.register('asahotak', {
    alias: ['asah', 'quiz'],
    emoji: '🎮',
    title: 'BRAIN TEASER',
    description: 'General knowledge brain teasers — guess the answer',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('asahotak')
export { pluginConfig as config, handler, answerHandler }
