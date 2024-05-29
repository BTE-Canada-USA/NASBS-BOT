import Command from '../struct/Command.js'
import { BuilderInterface } from '../struct/Builder.js'
import Discord from 'discord.js'
import Submission from '../struct/Submission.js'

export default new Command({
    name: 'points',
    description: 'View your points.',
    args: [
        {
            name: 'user',
            description: `View someone else's points`,
            required: false,
            optionType: 'user'
        },
        {
            name: 'global',
            description: `View global NASBS points from all teams`,
            required: false,
            optionType: 'boolean'
        }
    ],
    async run(i, client) {
        let guild = client.guildsData.get(i.guild.id)
        const options = i.options
        const user = options.getUser('user') || i.user
        const global = options.getBoolean('global')
        const userId = user.id
        let userData: BuilderInterface
        let usersAbove: number
        let usersAboveQuery: { count: number }[]

        let guildName: string
        let queryFilter = []

        if (global) {
            guildName = 'All Build Teams'
            guild = client.guildsData.get('global')
            queryFilter = [{
                $match: {
                    userId: userId
                }
            }]
        } else {
            // for non-global, just find within this guild
            guildName = i.guild.name

            queryFilter = [{
                $match: {
                    guildId: i.guild.id,
                    userId: user.id
                }
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
        let roadPoints = { $cond: { if: { $eq: ['$submissionType', 'ROAD'] }, then: { $multiply: [{ $toLong: '$roadType' }, { $toLong: '$roadKMs' }] }, else: 0 } }

        let pointsTotal = {
            $sum: [{
                $divide: [{
                    $multiply: [
                        { $sum: [onePoints, manyPoints, roadPoints] },
                        { $toLong: '$complexity' },
                        { $toLong: '$quality' },
                        { $toLong: '$bonus' }
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

        if (query.length == 0) {
            return i.reply({
                embeds: [
                    new Discord.MessageEmbed().setDescription(
                        `\`${user.username}\` has no completed builds!`
                    )
                ]
            })
        }

        let data = query[0]

        await i.reply({
            embeds: [
                new Discord.MessageEmbed()
                .setTitle(`POINTS!`)
                .setDescription(
                    `\`${user.username}\` has :tada: ***${data.points}***  :tada: points in ${guild.emoji} ${guildName} ${guild.emoji}!!\n\n
                    Number of buildings: :house: ***${data.buildings}***  :house: !!!\n
                    Sqm of land: :corn: ***${data.landMetersSquare}***  :corn:\n
                    Kilometers of roads: :motorway: ***${data.roadsKMs}***  :motorway:`
                )
            ]
        })
    }
})
