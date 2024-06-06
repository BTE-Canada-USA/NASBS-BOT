import Command from '../struct/Command.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import Rejection, { RejectionInterface } from '../struct/Rejection.js'
import Discord, { Message, TextChannel } from 'discord.js'
import { checkIfRejected } from '../utils/checkForSubmission.js'

export default new Command({
    name: 'see',
    description: 'SEE the review summary of a submission.',
    args: [
        {
            name: 'id',
            description: `message id of the submission`,
            required: true,
            optionType: 'string'
        }
    ],
    async run(i, client) {
        const options = i.options
        const guildData = client.guildsData.get(i.guild.id)
        const submitChannel = (await i.guild.channels.fetch(
            guildData.submitChannel
        )) as TextChannel
        const submissionId = options.getString('id')
        let submissionMsg: Message
        let summary: string
        let submissionLink = '[Link could not be generated]'

        // make sure user knows how to use msg ids
        try {
            submissionMsg = await submitChannel.messages.fetch(submissionId)
            submissionLink = `[Link](${submissionMsg.url})`
            await i.reply(
                `One moment...`
            )
        } catch (e) {
            await i.reply(
                `'${submissionId}' is not a message ID from the build submit channel on this server... checking anyways`
            )
        }

        // get submission from db
        const submissionData: SubmissionInterface = await Submission.findOne({
            _id: submissionId
        }).lean()

        // check if submission got rejected
        const isRejected = await checkIfRejected(submissionId)

        // return if submission is unreviewed (doesn't exist in rejections or submissions db)
        if (!submissionData && !isRejected) {
            return i.followUp(`this submission has not been reviewed yet!`)
        }

        let sizeName = {
            2: 'small',
            5: 'medium',
            10: 'large',
            20: 'monumental'
        }

        // if its rejection, get rejection from db
        if (isRejected) {
            const rejectionData: RejectionInterface = await Rejection.findOne({
                _id: submissionId
            }).lean()

            return i.followUp(`That submission was rejected : (\n\nFeedback: \`${rejectionData.feedback}\``)
        }

        summary = `This submission earned **${submissionData.pointsTotal} points!!!**\n
        Builder: <@${submissionData.userId}>
        *__Points breakdown:__*`

        // otherwise, it's a reviewed submission
        // write the summary depending on which type of submission it was
        switch (submissionData.submissionType) {
            case 'ONE':
                // write the summary
                summary += `Building type: ${sizeName}`
                break
            case 'MANY':
                summary += `Number of buildings (S/M/L): ${submissionData.smallAmt}/${submissionData.mediumAmt}/${submissionData.largeAmt}`
                break
            case 'LAND':
                summary += `Land area: ${submissionData.sqm} sqm`
                break
            case 'ROAD':
                summary += `Road type: ${submissionData.roadType}
                Distance: ${submissionData.roadKMs} km`
                break
        }

        summary += `Quality multiplier: x${submissionData.quality}
        Complexity multiplier: x${submissionData.complexity}
        Bonuses: x${submissionData.bonus}
        Collaborators: ${submissionData.collaborators}
        [Link](${submissionMsg.url})\n
        __Feedback:__ \`${submissionData.feedback}\``

        // send the review summary
        return i.followUp({
            embeds: [new Discord.MessageEmbed().setTitle(`POINTS!`).setDescription(summary)]
        })
    }
})
