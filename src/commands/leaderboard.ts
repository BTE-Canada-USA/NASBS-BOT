import Discord from 'discord.js'
import Command from '../struct/Command.js'
import Submission from '../struct/Submission.js'
import { pagination, TypesButtons } from '@devraelfreeze/discordjs-pagination'

/**
 * An individual user returned from the aggregation query
 */
interface LeaderboardUser {
    _id: string
    count: string
}

const ITEMS_PER_PAGE = 10
const MAX_SIZE = 50

export default new Command({
    name: 'leaderboard',
    description: 'Points leaderboard!',
    args: [
        {
            name: 'global',
            description: `Show NASBS leaderboard for all teams`,
            required: false,
            optionType: 'boolean'
        },
        {
            name: 'metric',
            description: 'What metric to rank people by (default is points)',
            // the values are the names of each metric in the db, so it can be used directly to query db
            choices: [
                ['Points', 'Points'],
                ['Buildings', 'Buildings'],
                ['Roads', 'Roads'],
                ['Land', 'Land']
            ],
            required: false,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        let guild = client.guildsData.get(i.guild.id)
        const global = options.getBoolean('global')
        const metric: string = options.getString('metric') || 'Points'

        let guildName: string
        let queryFilter = []

        if (global) {
            guildName = 'All Build Teams'
            let globalGuild = client.guildsData.get('global')
            if(globalGuild)
                guild = globalGuild 
        } else {
            // for non-global, just find within this guild
            guildName = i.guild.name

            queryFilter = [{
                $match: { guildId: i.guild.id }
            }]
        }

        let onePoints = { $cond: { if: { $eq: ['$submissionType', 'ONE'] }, then: { $toLong: '$size' }, else: 0 } }
        let manyPoints = {
            $cond: {
                if: { $eq: ['$submissionType', 'MANY'] }, then: {
                    $sum: [
                        { $multiply: [{ $toLong: '$smallAmt' }, 2] },
                        { $multiply: [{ $toLong: '$mediumAmt' }, 5] },
                        { $multiply: [{ $toLong: '$largeAmt' }, 10] }
                    ]
                }, else: 0
            }
        }
        let landPoints = { $cond: { if: { $eq: ['$submissionType', 'LAND'] }, then: { $toDouble: '$pointsTotal' }, else: 0 } }
        let roadPoints = { $cond: { if: { $eq: ['$submissionType', 'ROAD'] }, then: { $multiply: [{ $toLong: '$roadType' }, { $toDouble: '$roadKMs' }] }, else: 0 } }

        let pointsTotal = {
            $sum: [{
                $divide: [{
                    $multiply: [
                        { $sum: [onePoints, manyPoints, roadPoints] },
                        { $toDouble: '$complexity' },
                        { $toDouble: '$quality' },
                        { $toDouble: '$bonus' }
                    ]
                }, { $toLong: '$collaborators' }]
            }, landPoints]
        }


        let query = await Submission.aggregate([
            ...queryFilter,
            {
                $group: {
                    _id: '$userId',
                    points: { $sum: pointsTotal },
                    buildings: {
                        $sum: {
                            $sum: [
                                { $cond: { if: { $eq: ['$submissionType', 'ONE'] }, then: 1, else: 0 } },
                                {
                                    $cond: {
                                        if: { $eq: ['$submissionType', 'MANY'] }, then: {
                                            $sum: ['$smallAmt', '$mediumAmt', '$largeAmt']
                                        }, else: 0
                                    }
                                }
                            ]
                        }
                    },
                    roadsKMs: {
                        $sum: {
                            $cond: { if: { $eq: ['$submissionType', 'ROAD'] }, then: '$roadKMs', else: 0 }
                        }
                    },
                    landMetersSquare: {
                        $sum: {
                            $cond: { if: { $eq: ['$submissionType', 'LAND'] }, then: '$sqm', else: 0 }
                        }
                    }

                }
            }
        ])

        let leaderboard = []

        for (const [key, value] of Object.entries(query)) {
            let res = {
                Points: () => {
                    return value['points']
                },
                Buildings: () => {
                    return value['buildings']
                },
                Roads: () => {
                    return value['roadsKMs']
                },
                Land: () => {
                    return value['landMetersSquare']
                }
            }

            leaderboard.push({ id: value['_id'], val: res[metric]().toFixed(2).replace(/[.,]00$/, '') })
        }

        leaderboard.sort((a, b) => {
            return b['val'] - a['val']
        })

        leaderboard = leaderboard.slice(0, MAX_SIZE)


        const pluralsMap = {
            Points: 'points',
            Buildings: 'buildings',
            Roads: 'km',
            Land: 'm²'
        }

        let pages = []

        if (leaderboard.length == 0) {
            pages = [
                new Discord.MessageEmbed()
                .setTitle(`Doesn't look like any builds have been accepted here!`)
                .setDescription('')
            ]
        }

        for (let i = 0; i < Math.ceil(leaderboard.length / ITEMS_PER_PAGE); i++) {
            const startIndex = i * ITEMS_PER_PAGE
            const endIndex = startIndex + ITEMS_PER_PAGE
            const embed = new Discord.MessageEmbed()
            .setTitle(`${metric.charAt(0).toUpperCase() + metric.slice(1)} Leaderboard for ${guild.emoji} ${guildName} ${guild.emoji}`)
            .setDescription(leaderboard.map((element, index) => {
                return `**${index + 1}.** <@${element.id}>: ${element.val} ${pluralsMap[metric]}`
            }).slice(startIndex, endIndex).join('\n\n'))

            pages.push(embed)
        }

        await pagination({
            embeds: pages,
            author: i.user,
            interaction: i,
            ephemeral: false,
            time: 60 * 1000,
            disableButtons: true,
            fastSkip: false,
            pageTravel: false,
            buttons: [
                {
                    value: TypesButtons.previous,
                    label: 'Previous',
                    style: 'PRIMARY'
                },
                {
                    value: TypesButtons.next,
                    label: 'Next',
                    style: 'PRIMARY'
                }
            ]
        })
    }
})
