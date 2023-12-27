import { CommandInteraction } from 'discord.js'
import Reviewer, { ReviewerInterface } from '../struct/Reviewer.js'
import { SubmissionInterface } from '../struct/Submission.js'
import { countWords } from '../utils/countWords.js'

/**
 * update reviewer doc for an accepted review including edits
 * @param originalSubmission
 * @param submissionData
 * @param i
 */
async function updateReviewerForAcceptance(
    originalSubmission: SubmissionInterface,
    submissionData: SubmissionInterface,
    i: CommandInteraction
) {
    // if review is edit, get previous reviewer and remove the original review from their stats
    // do this first in case editor is same as reviewer: this order of doing things works properly
    if (submissionData.edit) {
        await updateReviewerForPurge(originalSubmission)
    }

    // now that edit thing is done, add new stats to reviewer
    // get the reviewer to update it
    const reviewer: ReviewerInterface = await Reviewer.findOne({
        id: submissionData.reviewer,
        guildId: submissionData.guildId
    }).lean()

    // if reviewer is brand-new fresh out of the oven newbie, don't need to calculate avgs
    if (!reviewer) {
        await Reviewer.updateOne(
            {
                id: submissionData.reviewer,
                guildId: submissionData.guildId
            },
            {
                $set: {
                    acceptances: 1,
                    rejections: 0,
                    complexityAvg: submissionData.complexity,
                    qualityAvg: submissionData.quality,
                    feedbackCharsAvg: submissionData.feedback.length,
                    feedbackWordsAvg: countWords(submissionData.feedback),
                    reviews: 1,
                    reviewsWithFeedback: 1
                }
            },
            { upsert: true }
        ).lean()
    } else {
        // otherwise, reviewer already has stats so update the avgs and everything
        // use formula for adding a value to the avg: newAvg = oldAvg + ((value - oldAvg)/ nValues)
        // nValues is the current number of values, so must +1 to reviewsWFeedback and acceptances
        // since they haven't been updated yet in db for this review
        const feedbackCharsAvg =
            reviewer.feedbackCharsAvg +
            (submissionData.feedback.length - reviewer.feedbackCharsAvg) /
                (reviewer.reviewsWithFeedback + 1)

        const feedbackWordsAvg =
            reviewer.feedbackWordsAvg +
            (countWords(submissionData.feedback) - reviewer.feedbackWordsAvg) /
                (reviewer.reviewsWithFeedback + 1)

        const qualityAvg =
            reviewer.qualityAvg +
            (submissionData.quality - reviewer.qualityAvg) / (reviewer.acceptances + 1)

        const complexityAvg =
            reviewer.complexityAvg +
            (submissionData.complexity - reviewer.complexityAvg) / (reviewer.acceptances + 1)

        // otherwise, increment acceptances, reviews, withfeedback, and set avgs to new avg
        await Reviewer.updateOne(
            {
                id: submissionData.reviewer,
                guildId: submissionData.guildId
            },
            {
                $inc: {
                    acceptances: 1,
                    reviews: 1,
                    reviewsWithFeedback: 1
                }
            }
        ).lean()

        // mongoose cant $set and $inc in one query, so have two queries
        await Reviewer.updateOne(
            {
                id: submissionData.reviewer,
                guildId: submissionData.guildId
            },
            {
                $set: {
                    complexityAvg: complexityAvg,
                    qualityAvg: qualityAvg,
                    feedbackCharsAvg: feedbackCharsAvg,
                    feedbackWordsAvg: feedbackWordsAvg
                }
            }
        ).lean()
    }

    i.followUp('updated reviewer!')
}

/**
 * update reviewer doc for a declined review, add the feedback to their stats
 * @param reviewer
 * @param feedback
 */
async function updateReviewerForRejection(reviewer: ReviewerInterface, feedback: string) {
    // add feedback to the reviewer's avgs
    const feedbackCharsAvg =
        (reviewer.feedbackCharsAvg * reviewer.reviewsWithFeedback - feedback.length) /
        reviewer.reviewsWithFeedback

    const feedbackWordsAvg =
        (reviewer.feedbackWordsAvg * reviewer.reviewsWithFeedback - countWords(feedback)) /
        reviewer.reviewsWithFeedback

    // add a rejection and a review
    await Reviewer.updateOne(
        {
            id: reviewer.id,
            guildId: reviewer.guildId
        },
        {
            $inc: {
                rejections: 1,
                reviews: 1,
                reviewsWithFeedback: 1
            }
        }
    ).lean()

    // update the feedback stats
    await Reviewer.updateOne(
        {
            id: reviewer.id,
            guildId: reviewer.guildId
        },
        {
            $set: {
                feedbackCharsAvg: feedbackCharsAvg,
                feedbackWordsAvg: feedbackWordsAvg
            }
        }
    ).lean()
}

/**
 * remove a review from a reviewer's stats
 * @param purgedSubmission the submission that will be removed
 */
async function updateReviewerForPurge(purgedSubmission: SubmissionInterface) {
    // get the reviewer to purge
    const reviewer: ReviewerInterface = await Reviewer.findOne({
        id: purgedSubmission.reviewer,
        guildId: purgedSubmission.guildId
    }).lean()

    // use formula for removing a value from avg
    // newAvg = (oldAvg * nValues - value) / (nValues - 1)
    // don't need to do -1 for nValues since this value hasn't been updated yet in db,
    // so reviewsWFeedback and acceptances is already the nValues - 1 we want
    const feedbackCharsAvg =
        (reviewer.feedbackCharsAvg * reviewer.reviewsWithFeedback -
            purgedSubmission.feedback.length) /
        reviewer.reviewsWithFeedback

    const feedbackWordsAvg =
        (reviewer.feedbackWordsAvg * reviewer.reviewsWithFeedback -
            countWords(purgedSubmission.feedback)) /
        reviewer.reviewsWithFeedback

    const qualityAvg =
        (reviewer.qualityAvg * reviewer.acceptances - purgedSubmission.quality) /
        reviewer.acceptances

    const complexityAvg =
        (reviewer.complexityAvg * reviewer.acceptances - purgedSubmission.complexity) /
        reviewer.acceptances

    // update old reviewer doc
    await Reviewer.updateOne(
        { id: reviewer.id, guildId: purgedSubmission.guildId },
        {
            $inc: {
                acceptances: -1,
                reviews: -1,
                reviewsWithFeedback: -1
            }
        }
    ).lean()

    // update old reviewer doc pt 2 because mongoose cant $set and $inc in 1 query
    await Reviewer.updateOne(
        { id: reviewer.id, guildId: purgedSubmission.guildId },
        {
            $set: {
                complexityAvg: complexityAvg,
                qualityAvg: qualityAvg,
                feedbackCharsAvg: feedbackCharsAvg,
                feedbackWordsAvg: feedbackWordsAvg
            }
        }
    ).lean()
}
export { updateReviewerForAcceptance, updateReviewerForRejection, updateReviewerForPurge }