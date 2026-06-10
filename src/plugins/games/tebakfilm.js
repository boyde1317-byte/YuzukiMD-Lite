import { games } from '../../lib/games.js'

games.register('tebakfilm', {
    alias: ['tf', 'guessmovie'],
    emoji: '🎮',
    title: 'GUESS THE MOVIE',
    description: 'Read the clue and guess the movie title',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakfilm')
export { pluginConfig as config, handler, answerHandler }
