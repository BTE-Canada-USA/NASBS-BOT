import Command from '../struct/Command.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import User from '../struct/User.js'
import { globalArgs, oneArgs, manyArgs, landArgs, roadArgs } from '../review/options.js'
import { checkForRankup } from '../review/rankup.js'
import Discord, { Message, MessageReaction, TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'

export default new Command({
    name: 'review',
    description: 'review builds.',
    reviewer: true,
    subCommands: [
        {
            name: 'one',
            description: 'Review one building.',
            args: [...globalArgs.slice(0, 1), ...oneArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'many',
            description: 'Review multiple buildings.',
            args: [...globalArgs.slice(0, 1), ...manyArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'land',
            description: 'Review land.',
            args: [...globalArgs.slice(0, 1), ...landArgs, ...globalArgs.slice(1)]
        },
        {
            name: 'road',
            description: 'Review road',
            args: [...globalArgs.slice(0, 1), ...roadArgs, ...globalArgs.slice(1)]
        }
    ],
    async run(i, client) {
        const guildData = client.guildsData.get(i.guild.id)
        const options = i.options
        const submitChannel = (await i.guild.channels.fetch(
            guildData.submitChannel
        )) as TextChannel //await client.channels.fetch(guildData.submitChannel)
        const submissionId = await options.getString('submissionid')
        const feedback = validateFeedback(options.getString('feedback'))
        const edit = options.getBoolean('edit') || false
        let submissionMsg: Message

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        if (submissionMsg.author.id == i.user.id) {
            return i.reply('you cannnot review your own builds <:bonk:720758421514878998>')
        }

        // Check if it already got declined / purged
        const isRejected = await checkIfRejected(submissionId)

        // Check if it already got accepted
        const originalSubmission = await Submission.findOne({
            _id: submissionId
        }).lean()

        if (edit && originalSubmission == null && !isRejected) {
            return i.reply(
                'that one hasnt been graded yet <:bonk:720758421514878998>! Use `edit=False`'
            )
        } else if (!edit && originalSubmission) {
            return i.reply(
                'that one already got graded <:bonk:720758421514878998>! Use `edit=True`'
            )
        } else if (!edit && isRejected) {
            return i.reply(
                'that one has already been rejected <:bonk:720758421514878998>! Use `edit=True`'
            )
        }

        // set variables shared by all subcommands
        await i.reply('doing stuff...')
        const userId = submissionMsg.author.id
        const bonus = options.getInteger('bonus') || 1
        const collaborators = options.getInteger('collaborators') || 1
        let pointsTotal
        let submissionData: SubmissionInterface = {
            _id: submissionId,
            guildId: i.guild.id,
            userId: userId,
            collaborators: collaborators,
            bonus: bonus,
            edit: edit,
            submissionTime: submissionMsg.createdTimestamp,
            reviewTime: i.createdTimestamp,
            reviewer: i.user.id,
            feedback: feedback
        }

        // review function used by all subcommands
        async function review(reply, data, countType, countValue) {
            if (
                edit &&
                originalSubmission &&
                originalSubmission.submissionType !== data.submissionType
            ) {
                return i.followUp(
                    "can't change submission type on edit <:bonk:720758421514878998>! Do `/purge` and then `/review` instead"
                )
            }

            try {
                // insert submission doc
                await Submission.updateOne({ _id: submissionId }, data, {
                    upsert: true
                }).lean()

                if (edit && originalSubmission) {
                    // get change from original submission, update user's total points and the countType field
                    const pointsIncrement = pointsTotal - originalSubmission.pointsTotal
                    const countTypeIncrement = (() => {
                        // If editing a submission with multiple buildings, get change in user's buildingCount from the submission's building counts, which are broken down by building size
                        if (data.submissionType === 'MANY') {
                            return (
                                countValue -
                                ((originalSubmission.smallAmt || 0) +
                                    (originalSubmission.mediumAmt || 0) +
                                    (originalSubmission.largeAmt || 0))
                            )
                        }
                        // If editing a single building, there's no need to change the buildingCount
                        else if (data.submissionType === 'ONE') {
                            return 0
                        } else {
                            return countValue - originalSubmission[countType]
                        }
                    })()
                    const userId = submissionMsg.author.id
                    await User.updateOne(
                        { id: userId, guildId: i.guild.id },
                        {
                            $inc: {
                                pointsTotal: pointsIncrement,
                                [countType]: countTypeIncrement
                            }
                        },
                        { upsert: true }
                    ).lean()

                    i.followUp(`EDITED <@${userId}> ${reply}`)
                } else {
                    // increment user's total points and building count/sqm/roadKMs
                    await User.updateOne(
                        { id: userId, guildId: i.guild.id },
                        {
                            $inc: {
                                pointsTotal: parseFloat(pointsTotal),
                                [countType]: countValue
                            }
                        },
                        { upsert: true }
                    ).lean()

                    // send dm if user has it enabled
                    const dmsEnabled = await areDmsEnabled(userId)

                    if (dmsEnabled) {
                        const member = await i.guild.members.fetch(userId)
                        const dm = await member.createDM()
                        await dm
                            .send({
                                embeds: [
                                    new Discord.MessageEmbed()
                                        .setTitle(
                                            `${guildData.emoji} Build reviewed! ${guildData.emoji}`
                                        )
                                        .setDescription(`You ${reply}`)
                                        .setFooter({
                                            text: `Use the cmd '/preferences' to toggle build review DMs.`
                                        })
                                ]
                            })
                            .catch((err) => {
                                console.log(err)
                                i.followUp(
                                    `${i.user} has dms turned off or something went wrong while sending the dm! ${err}`
                                )
                            })
                    }

                    // Remove all bot reactions, then add a '✅' reaction
                    await submissionMsg.reactions.cache.forEach((reaction: MessageReaction) =>
                        reaction.remove()
                    )
                    await submissionMsg.react('✅')
                    await i.followUp(
                        `SUCCESS YAY!!!<:HAOYEEEEEEEEEEAH:908834717913186414>\n\n<@${userId}> has ${reply}`
                    )
                }
            } catch (err) {
                console.log(err)
                i.followUp('ERROR HAPPENED! ' + err)
            }

            try {
                // get new point total for the user in order to check for rankup
                const current = await User.findOne({
                    id: userId,
                    guildId: i.guild.id
                }).lean()

                await checkForRankup(submissionMsg.member, current.pointsTotal, guildData, i)
            } catch (err) {
                console.log(err)
                i.followUp(`RANKUP ERROR HAPPENED! ${err}`)
            }
        }

        // subcommands
        if (i.options.getSubcommand() == 'one') {
            // set subcmd-specific variables
            const size = options.getInteger('size')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            let sizeName
            pointsTotal = (size * quality * complexity * bonus) / collaborators
            submissionData = {
                ...submissionData,
                submissionType: 'ONE',
                size: size,
                quality: quality,
                complexity: complexity,
                pointsTotal: pointsTotal
            }

            switch (size) {
                case 2:
                    sizeName = 'small'
                    break
                case 5:
                    sizeName = 'medium'
                    break
                case 10:
                    sizeName = 'large'
                    break
                case 20:
                    sizeName = 'monumental'
                    break
            }

            return review(
                `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nBuilding type: ${sizeName}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``,
                submissionData,
                'buildingCount',
                1
            )
        } else if (i.options.getSubcommand() == 'many') {
            const smallAmt = options.getInteger('smallamt')
            const mediumAmt = options.getInteger('mediumamt')
            const largeAmt = options.getInteger('largeamt')
            const quality = options.getNumber('avgquality')
            const complexity = options.getNumber('avgcomplexity')
            pointsTotal =
                (smallAmt * 2 + mediumAmt * 5 + largeAmt * 10) * quality * complexity * bonus

            submissionData = {
                ...submissionData,
                smallAmt: smallAmt,
                mediumAmt: mediumAmt,
                largeAmt: largeAmt,
                quality: quality,
                complexity: complexity,
                submissionType: 'MANY',
                pointsTotal: pointsTotal
            }

            return review(
                `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nNumber of buildings (S/M/L): ${smallAmt}/${mediumAmt}/${largeAmt}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``,
                submissionData,
                'buildingCount',
                smallAmt + mediumAmt + largeAmt
            )
        } else if (i.options.getSubcommand() == 'land') {
            const sqm = options.getNumber('sqm')
            const landtype = options.getInteger('landtype')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            pointsTotal =
                (sqm * landtype * complexity * quality * bonus) / 50000 / collaborators
            submissionData = {
                ...submissionData,
                sqm: sqm,
                complexity: complexity,
                submissionType: 'LAND',
                quality: quality,
                pointsTotal: pointsTotal
            }

            return review(
                `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nLand area: ${sqm} sqm\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``,
                submissionData,
                'sqm',
                sqm
            )
        } else if (i.options.getSubcommand() == 'road') {
            const roadType = options.getNumber('roadtype')
            const roadKMs = options.getNumber('distance')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            pointsTotal = (roadType * roadKMs * complexity * quality * bonus) / collaborators
            submissionData = {
                ...submissionData,
                roadType: roadType,
                roadKMs: roadKMs,
                complexity: complexity,
                submissionType: 'ROAD',
                quality: quality,
                pointsTotal: pointsTotal
            }

            return review(
                `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nRoad type: ${roadType}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nDistance: ${roadKMs} km\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\nFeedback: \`${feedback}\``,
                submissionData,
                'roadKMs',
                roadKMs
            )
        }
    }
})
