import { games } from '../../lib/games.js'

games.register('kataacak', {
    alias: ['ka', 'acakkata'],
    emoji: '🎮',
    title: 'WORD SCRAMBLE',
    description: 'Unscramble the letters to find the hidden word',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('kataacak')
export { pluginConfig as config, handler, answerHandler }
