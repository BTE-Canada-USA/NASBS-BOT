import Command from '../struct/Command.js'
import Builder from '../struct/Builder.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'

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
            const dmsEnabled = await areDmsEnabled(userId)

            if (dmsEnabled == toggle) {
                if (toggle == true) {
                    return i.reply('You already have build review DMs enabled!')
                } else {
                    return i.reply('You already have build review DMs disabled!')
                }
            }

            await Builder.updateMany({ id: userId }, { dm: toggle }).lean()

            if (toggle == true) {
                return i.reply('Build review DMs enabled YAY!!!! :thumbsup:')
            } else {
                return i.reply('Build review DMs disabled : (   :thumbsup:')
            }
        }
    }
})
