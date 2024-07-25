// const Rejection = require('../base/Rejection')
import Rejection from '../struct/Rejection.js'
import Command from '../struct/Command.js'
import { Message, TextChannel } from 'discord.js'
import { checkIfAccepted, checkIfRejected } from '../utils/checkForSubmission.js'
import validateFeedback from '../utils/validateFeedback.js'
import { updateReviewerForRejection } from '../review/updateReviewer.js'
import Reviewer from '../struct/Reviewer.js'
import Responses from '../utils/responses.js'
import submissionRejected = Responses.submissionRejected

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
            description: 'feedback for submission (1700 chars max)',
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

        // Check if it already got graded
        const isAccepted = await checkIfAccepted(submissionMsg.id)
        if (isAccepted) {
            return Responses.submissionHasAlreadyBeenAccepted(i)
        }

        // Check if it already got declined / purged
        const isRejected = await checkIfRejected(submissionMsg.id)
        if (isRejected) {
            return Responses.submissionHasAlreadyBeenDeclined(i)
        }

        // check if reviewer has reviewed yet or not. new reviewers cannot decline as a first review
        // because that breaks all the stats
        let reviewer = await Reviewer.findOne({ id: i.user.id, guildId: i.guild.id }).exec()

        if (!reviewer) {
            await Reviewer.updateOne(
                {
                    id: i.user.id,
                    guildId: i.guild.id
                },
                {
                    $set: {
                        acceptances: 0,
                        rejections: 0,
                        complexityAvg: 0,
                        qualityAvg: 0,
                        feedbackCharsAvg: 0,
                        feedbackWordsAvg: 0,
                        reviews: 0,
                        reviewsWithFeedback: 0
                    }
                },
                { upsert: true }
            )


            reviewer = await Reviewer.findOne({ id: i.user.id, guildId: i.guild.id }).exec()
        }

        // dm builder
        const builderId = submissionMsg.author.id
        const builder = await client.users.fetch(builderId)
        const dm = await builder.createDM()

        await dm.send(Responses.createEmbed(
            `__[Submission link](${submissionMsg.url})__
            Use this feedback to improve your build and resubmit it to gain points!
        
            \`${feedback}\``,
            `Your recent build submission needs revision.`
        )).catch((err) => {
            return Responses.errorDirectMessaging(i, err)
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

        // update reviewer
        await updateReviewerForRejection(reviewer, feedback)

        return submissionRejected(i, feedback, submissionMsg.url)
    }
})
