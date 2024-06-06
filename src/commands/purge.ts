import Command from '../struct/Command.js'
import Discord, { Message, TextChannel } from 'discord.js'
import Submission from '../struct/Submission.js'
import Builder from '../struct/Builder.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { updateReviewerForPurge } from '../review/updateReviewer.js'
import Rejection from '../struct/Rejection.js'

export default new Command({
    name: 'purge',
    description: 'Remove a submission that has already been accepted',
    reviewer: true,
    args: [
        {
            name: 'submissionid',
            description: 'Msg id of the submission',
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guild = client.guildsData.get(i.guild.id)
        const submissionId = options.getString('submissionid')
        const submitChannel = (await client.channels.fetch(guild.submitChannel)) as TextChannel

        let submissionMsg: Message
        let submissionLink = '[Link could not be generated]'

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
            submissionLink = `[Link](${submissionMsg.url})`

            await i.reply('One moment...')

        } catch (e) {
            await i.reply(
                `'${submissionId}' is not a message ID from the build submit channel on this server... checking anyways`
            )
        }

        const originalSubmission = await Submission.findById(submissionId)

        // Gate to ensure submission exists
        if (!originalSubmission) {
            const rejectedSubmission = await Rejection.findById(submissionId)
            if (rejectedSubmission) {
                return i.followUp('that one has already been rejected <:bonk:720758421514878998>!')
            }

            return i.followUp('Could not find a submission with that ID')
        }

        // Gate to ensure submission belongs to the server that is trying to remove it
        if (originalSubmission.guildId != i.guild.id) {
            return i.followUp('This submission belongs to another server and has not been merged. You do not have permission to purge it.')
        }

        // Delete submission from the database
        await originalSubmission.deleteOne().catch((err) => {
            console.log(err)
            return i.followUp(`ERROR HAPPENED: ${err}`)
        })

        // Update user's points
        const pointsIncrement = -originalSubmission.pointsTotal
        const buildingCountIncrement = (() => {
            switch (originalSubmission.submissionType) {
                case 'MANY':
                    return (
                        -originalSubmission.smallAmt -
                        originalSubmission.mediumAmt -
                        originalSubmission.largeAmt
                    )
                case 'ONE':
                    return -1
                default:
                    return 0
            }
        })()
        const roadKMsIncrement = -originalSubmission.roadKMs || 0
        const sqmIncrement = -originalSubmission.sqm || 0

        await Builder.updateOne(
            { id: originalSubmission.userId, guildId: i.guild.id },
            {
                $inc: {
                    pointsTotal: pointsIncrement,
                    buildingCount: buildingCountIncrement,
                    roadKMs: roadKMsIncrement,
                    sqm: sqmIncrement
                }
            },
            { upsert: true }
        )

        // Remove all bot reactions, then add a '❌' reaction
        if (submissionMsg) {
            submissionMsg.reactions.cache.forEach((reaction) => reaction.remove())
        }

        // update reviewer
        await updateReviewerForPurge(originalSubmission)

        const dmsEnabled = await areDmsEnabled(originalSubmission.userId)

        // Send a DM to the user if user wants dms
        try {
            if (dmsEnabled) {
                const builder = submissionMsg.author
                const dm = await builder.createDM()

                const embed = new Discord.MessageEmbed()
                .setTitle(`Your recent build submission has been removed.`)
                .setDescription(
                    `__${submissionLink}__\n\n`
                )

                await dm.send({ embeds: [embed] }).catch((err) => {
                    return i.followUp(
                        `\`${builder.username}#${builder.discriminator}\` has dms turned off or something went wrong while sending the dm! ${err}`
                    )
                })
            }
        } catch (e) {
        }


        await i.followUp(`PURGED SUBMISSION ${submissionLink}`)
    }
})
