import { CommandInteraction } from 'discord.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import Builder from '../struct/Builder.js'

// review function used by all subcommands
/**
 * add review to db, whether edit or initial review
 * @param reviewMsg msg to send in the review embed
 * @param submissionData
 * @param countType buildingCount/roadKMs/sqm
 * @param countValue the amount of buildings/roadKMs/sqms
 * @param originalSubmission the og submission doc if edited, or null if initial review
 * @param i the review command interaction
 * @returns
 */
async function addReviewToDb(
    reviewMsg: string,
    submissionData: SubmissionInterface,
    countType: string,
    countValue: number,
    originalSubmission: SubmissionInterface | null,
    i: CommandInteraction
) {
    // make sure edits don't change the submission type
    if (
        submissionData.edit &&
        originalSubmission &&
        originalSubmission.submissionType !== submissionData.submissionType
    ) {
        return i.editReply(`Can't change submission type on edit. Do \`/purge\` and then \`/review\` instead.`)
    }

    try {
        // insert submission doc
        await Submission.updateOne({ _id: submissionData._id }, submissionData, {
            upsert: true
        }).exec()

        // update builder doc
        if (submissionData.edit && originalSubmission) {
            // for edits ----------------------------------------------------
            // get change from original submission, update user's total points and the countType field
            const pointsIncrement = submissionData.pointsTotal - originalSubmission.pointsTotal
            const countTypeIncrement = (() => {
                // If editing a submission with multiple buildings, get change in user's buildingCount from the submission's building counts, which are broken down by building size
                if (submissionData.submissionType === 'MANY') {
                    return (
                        countValue -
                        ((originalSubmission.smallAmt || 0) +
                            (originalSubmission.mediumAmt || 0) +
                            (originalSubmission.largeAmt || 0))
                    )
                }
                // If editing a single building, there's no need to change the buildingCount
                else if (submissionData.submissionType === 'ONE') {
                    return 0
                } else {
                    return countValue - originalSubmission[countType]
                }
            })()

            // update the builder doc, adding/subtracting points and building/road/sqm count
            await Builder.updateOne(
                { id: submissionData.userId, guildId: i.guild.id },
                {
                    $inc: {
                        pointsTotal: pointsIncrement,
                        [countType]: countTypeIncrement
                    }
                },
                { upsert: true }
            ).exec()

            // confirmation msg
            return i.editReply(
                `The submission has been edited. 
                
                Builder has ${reviewMsg}`
            )
        } else {
            // for initial reviews ------------------------------------------
            // increment user's total points and building count/sqm/roadKMs
            await Builder.updateOne(
                { id: submissionData.userId, guildId: i.guild.id },
                {
                    $inc: {
                        pointsTotal: submissionData.pointsTotal,
                        [countType]: countValue
                    }
                },
                { upsert: true }
            ).exec()

            // confirmation msg
            return i.editReply(
                `The submission has been successfully reviewed.
                
                Builder has ${reviewMsg}`
            )
        }
    } catch (err) {
        console.log(err)
        return i.editReply('ERROR HAPPENED! ' + err)
    }
}

export { addReviewToDb }
