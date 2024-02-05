import Command from '../struct/Command.js'
import Submission from '../struct/Submission.js'
import Discord from 'discord.js'

export default new Command({
    name: 'serverpogress',
    description: 'view building counts in server.',
    reviewer: false,
    args: [{
        name: 'serverid',
        description: 'Server ID to get building counts from',
        required: false,
        optionType: 'string'
    }],
    async run(i, client) {
        const options = i.options
        const otherServer = options.getString('serverid')

        let server = i.guild.id

        if (otherServer) {
            server = otherServer
        }

        let buildings = await Submission.aggregate([
            { $match: {
                guildId: server
            }},
            { $project: {
                _id: 0,
                builds: {$cond: {
                    if: { $eq: [ '$submissionType', 'ONE' ] },
                    then: 1,
                    else: {$cond: { if: { $eq: [ '$submissionType', 'MANY' ] },
                        then:
                            { $add: [ '$smallAmt', '$mediumAmt', '$largeAmt' ] },
                        else: 0
                    }}
                }}
            }},
            { $group: {
                _id: 0,
                sumBuilds: { $sum: '$builds' }
            }}
        ])

        let numBuilds = 0;
        if(buildings.length > 0) {
            numBuilds = buildings[0].sumBuilds
        }

        return i.reply({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(`Server Progress!`)
                    .setDescription(
                        `This server has ${numBuilds} completed buildings!`
                    )
            ]
        })
    }
})