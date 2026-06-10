import { games } from '../../lib/games.js'

games.register('siapakahaku', {
    alias: ['siapa', 'whoami'],
    emoji: '🎮',
    title: 'WHO AM I?',
    description: 'Read the clues and guess what I am',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('siapakahaku')
export { pluginConfig as config, handler, answerHandler }
