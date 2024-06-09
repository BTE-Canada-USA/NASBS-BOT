import Command from '../struct/Command.js'
import Guild from '../struct/Guild.js'

export default new Command({
    name: 'settings',
    description: 'Configure server settings.',
    reviewer: true,
    args: [
        {
            name: 'buildsubmit',
            description: 'Build submit channel ID',
            required: true,
            optionType: 'string'
        },
        {
            name: 'name',
            description: 'Name of server',
            required: true,
            optionType: 'string'
        },
        {
            name: 'reviewersrole',
            description: 'Reviewer role ID',
            required: true,
            optionType: 'string'
        },
        {
            name: 'rank1',
            description: 'Level 1 rank role ID',
            required: true,
            optionType: 'string'
        },
        {
            name: 'rank2',
            description: 'Level 2 rank role ID',
            required: true,
            optionType: 'string'
        },
        {
            name: 'rank3',
            description: 'Level 3 rank role ID',
            required: true,
            optionType: 'string'
        },
        {
            name: 'rank4',
            description: 'Level 4 rank role ID',
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {

        // TODO: I think this will always be true in this bot so likely this is the end of the command for now...
        if (i) {
            return i.editReply('this command is under construction.')
        }

        const options = i.options
        const guildId = i.guild.id
        const settings = {
            id: guildId,
            name: options.getString('name'),
            submitChannel: options.getString('buildsubmit'),
            reviewerRole: options.getString('reviewersrole'),
            ranks: {
                level1: options.getString('rank1'),
                level2: options.getString('rank2'),
                level3: options.getString('rank3'),
                level4: options.getString('rank4')
            }
        }

        Guild.find({ id: guildId }, async function(err, guild) {
            if (err) return i.editReply(`${err}`)
            await Guild.updateOne({ id: guildId }, settings, { upsert: true })
            if (guild) {
                return i.editReply('Server settings successfully updated!')
            } else {
                return i.editReply('New server settings successfully created!')
            }
            //  client.guildsData.set(guildId, settings)
        })
    }
})
