import { games } from '../../lib/games.js'

games.register('tebaklagu', {
    alias: ['tl', 'guesssong'],
    emoji: '🎮',
    title: 'GUESS THE SONG',
    description: 'Read the clue and guess the song title and artist',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebaklagu')
export { pluginConfig as config, handler, answerHandler }
