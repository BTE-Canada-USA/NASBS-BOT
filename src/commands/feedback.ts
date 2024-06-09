import Command from '../struct/Command.js'
import { Message, TextChannel } from 'discord.js'
import validateFeedback from '../utils/validateFeedback.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'
import Responses from '../utils/responses.js'

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
            return Responses.invalidSubmissionID(i, submissionId)
        }

        // check if submission has even been reviewed yet
        if (!(await checkIfRejected(submissionId)) && !(await checkIfAccepted(submissionId))) {
            return Responses.submissionHasNotBeenReviewed(i)
        }

        // get builder now that confirmed it's a valid situation
        const builder = await client.users.fetch(submissionMsg.author.id)
        const dm = await builder.createDM()

        dm.send(Responses.createEmbed(
            `__[Submission link](${submissionMsg.url})__
            If you want, use this feedback to improve your build so you can resubmit it for more points!
            
            \`${feedback}\``,
            `Here is some feedback for how you can improve your recent build submission!`
        )).catch((err) => {
            return Responses.errorDirectMessaging(i, err)
        })

        return Responses.feedbackSent(i, feedback, submissionMsg.url)
    }
})
