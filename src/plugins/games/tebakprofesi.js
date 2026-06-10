import { games } from '../../lib/games.js'

games.register('tebakprofesi', {
    alias: ['tp', 'guessjob'],
    emoji: '🎮',
    title: 'GUESS THE PROFESSION',
    description: 'Read the description and name the job or profession',
})

const { config: pluginConfig, handler, answerHandler } = games.createPlugin('tebakprofesi')
export { pluginConfig as config, handler, answerHandler }
