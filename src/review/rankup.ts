import Discord from 'discord.js'
import Submission from '../struct/Submission.js'

// function for sending dm and upgrading role, same for all rankups
async function doRankup(member, emoji, name, msg, roleId, i) {
    // send rankup DM
    const embed = new Discord.MessageEmbed()
        .setTitle(
            `NEW RANK ACHIEVED! You're now a ${emoji} ${emoji} **${name}!** ${emoji} ${emoji}`
        )
        .setDescription(msg)

    const dm = await member.createDM()
    await dm.send({ embeds: [embed] }).catch((err) => {
        return `${member} has dms turned off or something went wrong while sending the dm! ${err}`
    })

    // add new role, remove previous rank role
    await member.roles.add(roleId)

    return i.followUp(`user ranked up to **${name}!**`)
}

// check if builder qualifies for rankup
async function checkForRankup(member, points, guild, i) {
    // if cant get the member, they must not be in server so cant rankup
    if (!member) {
        return i.followUp('member is no longer in this server')
    }

    // otherwise, proceed with checking for rankup
    if (
        points >= guild.rank2.points &&
        points < guild.rank3.points &&
        !member.roles.cache.get(guild.rank2.id)
    ) {
        return doRankup(
            member,
            guild.emoji,
            guild.rank2.name,
            `__As a ${guild.rank2.name}, you are now qualified to build **Medium Builds!**__\n\nExamples: Department stores, strip malls, parking garages, marinas, schools, mid-rise apartments, small airports/harbors, etc!`,
            guild.rank2.id,
            i
        )
    } else if (
        points >= guild.rank3.points &&
        points < guild.rank4.points &&
        !member.roles.cache.get(guild.rank3.id)
    ) {
        // check if builder has 50 pts of >1.5x quality size medium or bigger builds by summing points from ONE and MANY which meet that criteria
        const userPoints = await Submission.aggregate([
            {
                $match: {
                    userId: member.id,
                    guildId: guild.id,
                    quality: { $gte: 1.5 }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    pointsTotal: {
                        $sum: {
                            $cond: [
                                // if submission type is ONE and the size is 5 or greater (medium), add the submission's pointstotal to the sum
                                { $eq: ['$submissionType', 'ONE'] },
                                { $cond: [{ $gte: ['$size', 5] }, '$pointsTotal', 0] },
                                // else the submission type must be MANY, so calculate # of points from mediums and add it to the sum
                                {
                                    $multiply: [
                                        {
                                            $multiply: [
                                                {
                                                    $sum: [
                                                        { $multiply: ['$mediumAmt', 5] },
                                                        { $multiply: ['$largeAmt', 10] }
                                                    ]
                                                },
                                                '$quality'
                                            ]
                                        },
                                        '$complexity'
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        ])

        if (userPoints[0].pointsTotal >= 100) {
            return doRankup(
                member,
                guild.emoji,
                guild.rank3.name,
                `__As a ${guild.rank3.name}, you are now qualified to build **Large Builds!**__\n\nExamples: Skyscrapers, high-rises, convention centers, universities, large airports/harbours, etc!`,
                guild.rank3.id,
                i
            )
        }
    } else if (
        points >= guild.rank4.points &&
        points < guild.rank5.points &&
        !member.roles.cache.get(guild.rank4.id)
    ) {
        console.log(member)
        // check if builder has 150 pts of >1.5x quality size medium or bigger builds by summing points from ONE and MANY which meet that criteria
        const userPoints = await Submission.aggregate([
            {
                $match: {
                    userId: member.id,
                    guildId: guild.id,
                    quality: { $gte: 1.5 }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    pointsTotal: {
                        $sum: {
                            $cond: [
                                { $eq: ['$submissionType', 'ONE'] },
                                { $cond: [{ $gte: ['$size', 5] }, '$pointsTotal', 0] },
                                {
                                    // multiply total base mediumAmt and largeAmt points by quality to get total medium+large points from MANY submissions
                                    $multiply: [
                                        {
                                            $multiply: [
                                                {
                                                    $sum: [
                                                        { $multiply: ['$mediumAmt', 5] },
                                                        { $multiply: ['$largeAmt', 10] }
                                                    ]
                                                },
                                                '$quality'
                                            ]
                                        },
                                        '$complexity'
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        ])
        if (userPoints[0].pointsTotal >= 200) {
            return doRankup(
                member,
                guild.emoji,
                guild.rank4.name,
                `__As a ${guild.rank4.name}, you are now qualified to build **Monumental Builds!**__\n\nExamples: Stadiums, amusement parks, megamalls, large medical or educational complexes, etc!`,
                guild.rank4.id,
                i
            )
        }
    } else if (points >= guild.rank5.points && !member.roles.cache.get(guild.rank5.id)) {
        console.log(member)
        const userPoints = await Submission.aggregate([
            {
                $match: {
                    userId: member.id,
                    guildId: guild.id,
                    quality: { $gte: 2 }
                }
            },
            {
                $group: {
                    _id: '$userId',
                    pointsTotal: {
                        $sum: {
                            $cond: [
                                // if submission type is ONE, add the submission's pointstotal to the sum (size doesnt matter [:meemaw:])
                                { $eq: ['$submissionType', 'ONE'] },
                                '$pointsTotal',
                                // else the submission type must be MANY, so calculate # of points from all sizes and add it to the sum
                                {
                                    // multiply total base mediumAmt and largeAmt points by quality to get total medium+large points from MANY submissions
                                    $multiply: [
                                        {
                                            $multiply: [
                                                {
                                                    $sum: [
                                                        { $multiply: ['$smallAmt', 2] },
                                                        { $multiply: ['$mediumAmt', 5] },
                                                        { $multiply: ['$largeAmt', 10] }
                                                    ]
                                                },
                                                '$quality'
                                            ]
                                        },
                                        '$complexity'
                                    ]
                                }
                            ]
                        }
                    }
                }
            }
        ])

        if (userPoints[0].pointsTotal >= 400) {
            return doRankup(
                member,
                guild.emoji,
                guild.rank5.name,
                `As a ${guild.rank5.name}, you win ***extreme*** **bragging rights** because wtf how did you build so much <:what:743604228299292722>.`,
                guild.rank5.id,
                i
            )
        }
    }
}

export { checkForRankup }
