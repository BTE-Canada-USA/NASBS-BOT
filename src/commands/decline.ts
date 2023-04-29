// const Rejection = require('../base/Rejection')
import Rejection from '../struct/Rejection.js'
import Command from '../struct/Command.js'
import Discord, { TextChannel } from 'discord.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'

export default new Command({
    name: 'decline',
    description: 'Decline a submission.',
    reviewer: true,
    args: [
        {
            name: 'submissionid',
            description: 'Msg id of the submission',
            required: true,
            optionType: 'string'
        },
        {
            name: 'feedback',
            description: 'feedback for submission (1000 chars max)',
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guild = client.guildsData.get(i.guild.id)
        const submissionId = options.getString('submissionid')
        const feedback = validateFeedback(options.getString('feedback'))
        const submitChannel = (await client.channels.fetch(guild.submitChannel)) as TextChannel

        let submissionMsg

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        // Check if it already got graded
        const isAccepted = await checkIfAccepted(submissionMsg)
        if (isAccepted) {
            return i.reply(
                'that one already got accepted <:bonk:720758421514878998>! Use `/purge` instead'
            )
        }

        // Check if it already got declined / purged
        const isRejected = await checkIfRejected(submissionMsg)
        if (isRejected) {
            return i.reply('that one has already been rejected <:bonk:720758421514878998>!')
        }

        // dm builder
        const builderId = submissionMsg.author.id
        const builder = await client.users.fetch(builderId)
        const dm = await builder.createDM()

        const embed = new Discord.MessageEmbed()
            .setTitle(`Your recent build submission has been declined.`)
            .setDescription(
                `__[Submission link](${submissionMsg.url})__\nUse this feedback to improve your build and resubmit it to gain points!\n\n\`${feedback}\``
            )

        await dm.send({ embeds: [embed] }).catch((err) => {
            return i.reply(
                `\`${builder.username}#${builder.discriminator}\`has dms turned off or something went wrong while sending the dm! ${err}`
            )
        })

        // record rejection in db
        const rejection = new Rejection({
            _id: submissionId,
            guildId: i.guild.id,
            userId: builderId,
            submissionTime: submissionMsg.createdTimestamp,
            reviewTime: i.createdTimestamp,
            reviewer: i.user.id,
            feedback: feedback
        })
        await rejection.save()
        await submissionMsg.react('❌')
        return i.reply(
            `rejected and feedback sent :weena!: \`${feedback}\`\n__[Submission link](<${submissionMsg.url}>)__`
        )
    }
})
