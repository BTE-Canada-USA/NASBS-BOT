import Command from '../struct/Command.js'
import Builder from '../struct/Builder.js'
import Submission from '../struct/Submission.js'
import Discord from 'discord.js'

const MASTER_BUILDER_QUALITY_POINTS = 200
const ARCHITECT_QUALITY_POINTS = 500
const CHAMPION_QUALITY_POINTS = 1000

export default new Command({
    name: 'pogress',
    description: 'View your rankup progress.',
    args: [
        {
            name: 'user',
            description: `View someone else's rankup progress`,
            required: false,
            optionType: 'user'
        }
    ],
    async run(i, client) {
        const guildData = client.guildsData.get(i.guild.id)
        const guildName = guildData.name
        const guildId = i.guild.id
        const options = i.options
        const user = options.getUser('user') || i.user
        const userId = user.id
        const member = await i.guild.members.fetch(userId)
        const userData = await Builder.findOne({
            id: userId,
            guildId: guildData.id
        }).lean()

        await i.deferReply()

        let onePoints = { $cond: { if: { $eq: ['$submissionType', 'ONE'] }, then: { $toLong: '$size' }, else: 0 } }
        let largerOnePoints = {
            $cond: {
                if: { $eq: ['$submissionType', 'ONE'] }, then: {
                    $cond: {
                        if: { $gte: [{ $toLong: '$size' }, 5] },
                        then: { $toLong: '$size' },
                        else: 0
                    }
                }, else: 0
            }
        }
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
        let largerManyPoints = {
            $cond: {
                if: { $eq: ['$submissionType', 'MANY'] }, then: {
                    $sum: [
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

        let largerPointsTotal = {
            $divide: [{
                $multiply: [
                    { $sum: [largerOnePoints, largerManyPoints] },
                    { $toDouble: '$complexity' },
                    { $toDouble: '$quality' },
                    { $toDouble: '$bonus' }
                ]
            }, { $toLong: '$collaborators' }]
        }

        let pointsQuery = await Submission.aggregate([
            {
                $match: {
                    guildId: i.guild.id,
                    userId: user.id
                }
            },
            {
                $group: {
                    _id: '$userId',
                    points: { $sum: pointsTotal }
                }
            }
        ])

        if (pointsQuery[0] === undefined) {
            return i.editReply({
                embeds: [new Discord.MessageEmbed().setDescription(`\<@${user.id}> has no completed builds!`)]
            })
        }

        let points = pointsQuery[0].points

        // they are not above a normal builder
        if (points < guildData.rank2.points) {
            return i.editReply({
                embeds: [new Discord.MessageEmbed().setDescription(
                    `**Progress of <@${user.id}> in ${guildData.emoji} ${guildName} ${guildData.emoji}**
                    
                    **Current rank:** ${guildData.rank1.name}
                    
                    **Progress towards ${guildData.rank2.name}:**
                    ${points.toFixed(2).replace(/[.,]00$/, '')}/${guildData.rank2.points} points`
                )]
            })
        }

        let largerBuildsQuery = await Submission.aggregate([
            {
                $match: {
                    guildId: i.guild.id,
                    userId: user.id,
                    quality: { $gte: 1.5 } // TODO: ask if this is correct
                }
            },
            {
                $group: {
                    _id: '$userId',
                    points: { $sum: largerPointsTotal }
                }
            }
        ])

        // sets the value to 0 if we get no results
        let largeBuildPoints = (largerBuildsQuery[0] === undefined) ? 0 : largerBuildsQuery[0].points

        // they are not above master builder
        if (points < guildData.rank3.points || largeBuildPoints < MASTER_BUILDER_QUALITY_POINTS) {
            return i.editReply({
                embeds: [new Discord.MessageEmbed().setDescription(
                    `**Progress of <@${user.id}> in ${guildData.emoji} ${guildName} ${guildData.emoji}**
                    
                    **Current rank:** ${guildData.rank2.name}
                    
                    **Progress towards ${guildData.rank3.name}:**
                    ${points.toFixed(2).replace(/[.,]00$/, '')}**/${guildData.rank3.points}** points
                    ${largeBuildPoints.toFixed(2).replace(/[.,]00$/, '')}**/${MASTER_BUILDER_QUALITY_POINTS}** points from Good/Excellent quality Medium builds`
                )]
            })
        }

        // they are not above architect
        if (points < guildData.rank4.points || largeBuildPoints < ARCHITECT_QUALITY_POINTS) {
            return i.editReply({
                embeds: [new Discord.MessageEmbed().setDescription(
                    `**Progress of <@${user.id}> in ${guildData.emoji} ${guildName} ${guildData.emoji}**
                        
                    **Current rank:** ${guildData.rank3.name}
                    
                    **Progress towards ${guildData.rank4.name}:**
                    ${points.toFixed(2).replace(/[.,]00$/, '')}**/${guildData.rank4.points}** points
                    ${largeBuildPoints.toFixed(2).replace(/[.,]00$/, '')}**/${ARCHITECT_QUALITY_POINTS}** points from Good/Excellent quality Medium/Large builds`
                )]
            })
        }

        let championBuildQuery = await Submission.aggregate([
            {
                $match: {
                    guildId: i.guild.id,
                    userId: user.id,
                    quality: { $gte: 2 } // TODO: ask if this is correct
                }
            },
            {
                $group: {
                    _id: '$userId',
                    points: { $sum: pointsTotal }
                }
            }
        ])

        // sets the value to 0 if we get no results
        let championBuildPoints = (championBuildQuery[0] === undefined) ? 0 : championBuildQuery[0].points

        if (points < guildData.rank5.points || championBuildPoints < MASTER_BUILDER_QUALITY_POINTS) {
            return i.editReply({
                embeds: [new Discord.MessageEmbed().setDescription(
                    `**Progress of <@${user.id}> in ${guildData.emoji} ${guildName} ${guildData.emoji}**
                    
                    **Current rank:** ${guildData.rank4.name}!
                    
                    **Progress towards ${guildData.rank5.name}:**
                    ${points.toFixed(2).replace(/[.,]00$/, '')}**/${guildData.rank5.points}** points
                    ${championBuildPoints.toFixed(2).replace(/[.,]00$/, '')}**/${MASTER_BUILDER_QUALITY_POINTS}** points from Excellent quality builds of any size`
                )]
            })
        }

        return i.editReply({
            embeds: [new Discord.MessageEmbed().setDescription(
                `**Progress of <@${user.id}> in ${guildData.emoji} ${guildName} ${guildData.emoji}**
                    
                **Current rank:** ${guildData.rank5.name}!
                
                You are at the top. Congratulations!`
            )]
        })
    }
})
