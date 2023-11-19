import Command from '../struct/Command.js'
import Discord, { Message, TextChannel } from 'discord.js'
import validateFeedback from '../utils/validateFeedback.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'

export default new Command({
    name: 'feedback',
    description: 'Send feedback for a submission.',
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
            description: 'feedback (1700 characters max)',
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
        let submissionMsg: Message

        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
        } catch (e) {
            return i.reply(
                `'${submissionId}' is not a valid message ID from the build submit channel!`
            )
        }

        // check if submission has even been reviewed yet
        if (!(await checkIfRejected(submissionId)) && !(await checkIfAccepted(submissionId))) {
            return i.reply('that submission has not been reviewed yet!')
        }

        // get builder now that confirmed it's a valid situation
        const builder = await client.users.fetch(submissionMsg.author.id)
        const dm = await builder.createDM()

        const embed = new Discord.MessageEmbed()
            .setTitle(
                `Here is some feedback for how you can improve your recent build submission!`
            )
            .setDescription(
                `__[Submission link](${submissionMsg.url})__\nIf you want, use this feedback to improve your build so you can resubmit it for more points!\n\n\`${feedback}\``
            )

        dm.send({ embeds: [embed] }).catch((err) => {
            return i.reply(
                `${builder} has dms turned off or something went wrong while sending the dm! ${err}`
            )
        })

        return i.reply(
            `feedback sent :weena!: \`${feedback}\`\n__[Submission link](<${submissionMsg.url}>)__`
        )
    }
})
