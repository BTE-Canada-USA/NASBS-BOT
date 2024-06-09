import Command from '../struct/Command.js'
import Builder from '../struct/Builder.js'
import Responses from '../utils/responses.js'

export default new Command({
    name: 'preferences',
    description: 'Set user preferences.',
    subCommands: [
        {
            name: 'dm',
            description: 'Enable/disable build review DMs.',
            args: [
                {
                    name: 'enabled',
                    description: 'Enable/disable build review DMs.',
                    required: true,
                    optionType: 'boolean'
                }
            ]
        }
    ],
    async run(i, client) {
        if (i.options.getSubcommand() == 'dm') {
            const toggle = i.options.getBoolean('enabled')
            const userId = i.user.id

            await Builder.updateMany({ id: userId }, { dm: toggle }).exec()

            return Responses.dmPreferenceUpdated(i, toggle)
        }
    }
})
