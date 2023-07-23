import Command from '../struct/Command.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import Builder from '../struct/Builder.js'
import { globalArgs, oneArgs, manyArgs, landArgs, roadArgs } from '../review/options.js'
import { checkForRankup } from '../review/checkForRankup.js'
import Discord, { GuildMember, Message, MessageReaction, TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { addReviewToDb } from '../review/addReviewToDb.js'
import { sendDm } from '../review/sendDm.js'
import { addCheckmarkReaction } from '../review/addCheckmarkReaction.js'

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
        const builder = submissionMsg.author
        const builderId = submissionMsg.author.id
        const bonus = options.getInteger('bonus') || 1
        const collaborators = options.getInteger('collaborators') || 1
        let pointsTotal: number
        let submissionData: SubmissionInterface = {
            _id: submissionId,
            guildId: i.guild.id,
            userId: builderId,
            collaborators: collaborators,
            bonus: bonus,
            edit: edit,
            submissionTime: submissionMsg.createdTimestamp,
            reviewTime: i.createdTimestamp,
            reviewer: i.user.id,
            feedback: feedback
        }

        // get builder as member using fetch, not from msg.member because thats bad
        let member: GuildMember
        try {
            member = await i.guild.members.fetch(builderId)
        } catch (e) {
            member = null
        }

        // subcommands
        if (i.options.getSubcommand() == 'one') {
            // set subcmd-specific variables
            const size = options.getInteger('size')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            let sizeName: string
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
            const reply = `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nBuilding type: ${sizeName}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(member, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'buildingCount',
                1,
                edit,
                originalSubmission,
                i
            )
            await sendDm(member, guildData, reply, i)
            await addCheckmarkReaction(submissionMsg)
        } else if (i.options.getSubcommand() == 'many') {
            const smallAmt = options.getInteger('smallamt')
            const mediumAmt = options.getInteger('mediumamt')
            const largeAmt = options.getInteger('largeamt')
            const quality = options.getNumber('avgquality')
            const complexity = options.getNumber('avgcomplexity')
            pointsTotal =
                ((smallAmt * 2 + mediumAmt * 5 + largeAmt * 10) *
                    quality *
                    complexity *
                    bonus) /
                collaborators

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
            const reply = `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nNumber of buildings (S/M/L): ${smallAmt}/${mediumAmt}/${largeAmt}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(member, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'buildingCount',
                smallAmt + mediumAmt + largeAmt,
                edit,
                originalSubmission,
                i
            )
            await sendDm(member, guildData, reply, i)
            await addCheckmarkReaction(submissionMsg)
        } else if (i.options.getSubcommand() == 'land') {
            const sqm = options.getNumber('sqm')
            const landtype = options.getInteger('landtype')
            const quality = options.getNumber('quality')
            const complexity = options.getNumber('complexity')
            pointsTotal =
                (sqm * landtype * complexity * quality * bonus) / 100000 / collaborators
            submissionData = {
                ...submissionData,
                sqm: sqm,
                complexity: complexity,
                submissionType: 'LAND',
                quality: quality,
                pointsTotal: pointsTotal
            }

            const reply = `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nLand area: ${sqm} sqm\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\n__Feedback:__ \`${feedback}\``

            // do review things
            await checkForRankup(member, guildData, i)
            await addReviewToDb(reply, submissionData, 'sqm', sqm, edit, originalSubmission, i)
            await sendDm(member, guildData, reply, i)
            await addCheckmarkReaction(submissionMsg)
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

            const reply = `gained **${pointsTotal} points!!!**\n\n*__Points breakdown:__*\nRoad type: ${roadType}\nQuality multiplier: x${quality}\nComplexity multiplier: x${complexity}\nDistance: ${roadKMs} km\nBonuses: x${bonus}\nCollaborators: ${collaborators}\n[Link](${submissionMsg.url})\n\nFeedback: \`${feedback}\``

            // do review things
            await checkForRankup(member, guildData, i)
            await addReviewToDb(
                reply,
                submissionData,
                'roadKMs',
                roadKMs,
                edit,
                originalSubmission,
                i
            )
            await sendDm(member, guildData, reply, i)
            await addCheckmarkReaction(submissionMsg)
        }
    }
})
