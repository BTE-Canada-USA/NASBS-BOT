import Command from '../struct/Command.js'
import User from '../struct/User.js'
import Discord from 'discord.js'

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
        const guild = client.guildsData.get(i.guild.id)
        const options = i.options
        const user = options.getUser('user') || i.user
        const global = options.getBoolean('global')
        const userId = user.id
        let guildName
        let userData
        let usersAbove

        if (global) {
            // sum user's stats from all guilds
            guildName = 'all build teams'
            userData = await User.aggregate([
                { $match: { id: userId } },
                {
                    $group: {
                        _id: '$id',
                        pointsTotal: { $sum: '$pointsTotal' },
                        buildingCount: { $sum: '$buildingCount' },
                        roadKMs: { $sum: '$roadKMs' },
                        sqm: { $sum: '$sqm' }
                    }
                }
            ])
            userData = userData[0]

            // return if user does not exist in db
            if (!userData) {
                return i.reply({
                    embeds: [
                        new Discord.MessageEmbed().setDescription(
                            `<@${userId}> has not gained any points in any teams yet :frowning2: <:sad_cat:873457028981481473>`
                        )
                    ]
                })
            }

            // get global leaderboard position by getting global points of all users, then counting how many users have more global points
            usersAbove = await User.aggregate([
                {
                    $group: {
                        _id: '$id',
                        pointsTotal: { $sum: '$pointsTotal' }
                    }
                },
                {
                    $match: { pointsTotal: { $gt: userData.pointsTotal } }
                },
                { $count: 'count' }
            ])
        } else {
            guildName = guild.name
            userData = await User.findOne({
                id: userId,
                guildId: guild.id
            }).lean()

            // return if user does not exist in db
            if (!userData) {
                return i.reply({
                    embeds: [
                        new Discord.MessageEmbed().setDescription(
                            `<@${userId}> has not gained any points in ${guild.emoji} ${guildName} ${guild.emoji} yet :frowning2: <:sad_cat:873457028981481473>`
                        )
                    ]
                })
            }

            // get guild leaderboard position by getting points of all users in guild, then counting how many users have more points
            usersAbove = await User.aggregate([
                {
                    $match: { guildId: guild.id }
                },
                {
                    $group: {
                        _id: '$id',
                        pointsTotal: { $sum: '$pointsTotal' }
                    }
                },
                {
                    $match: { pointsTotal: { $gt: userData.pointsTotal } }
                },
                { $count: 'count' }
            ])
        }

        if (usersAbove.length == 0) {
            usersAbove = 0
        } else {
            usersAbove = usersAbove[0].count
        }

        await i.reply({
            embeds: [
                new Discord.MessageEmbed()
                    .setTitle(`POINTS!`)
                    .setDescription(
                        `${user} has :tada: ***${userData.pointsTotal}***  :tada: points in ${
                            guild.emoji
                        } ${guildName} ${guild.emoji}!!\n\nNumber of buildings: :house: ***${
                            userData.buildingCount || 0
                        }***  :house: !!!\nSqm of land: :corn: ***${
                            userData.sqm || 0
                        }***  :corn:\nKilometers of roads: :motorway: ***${
                            userData.roadKMs || 0
                        }***  :motorway:\n\nLeaderboard position in ${
                            guild.emoji
                        } ${guildName} ${guild.emoji}: **#${usersAbove + 1}**`
                    )
            ]
        })
    }
})
