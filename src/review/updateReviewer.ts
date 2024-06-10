import { CommandInteraction } from 'discord.js'
import Reviewer, { ReviewerInterface } from '../struct/Reviewer.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import { countWords } from '../utils/countWords.js'
import Rejection from '../struct/Rejection.js'

async function updateReviewerAverages(reviewer: ReviewerInterface) {

    let averages = await Submission.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId }
                ]
            }
        },
        {
            $group: {
                _id: '$reviewer',
                quality_average: { $avg: '$quality' },
                complexity_average: { $avg: '$complexity' }
            }
        }
    ])

    let submissionFeedback = await Submission.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId },
                    { feedback: { $exists: true } }
                ]
            }
        }, {
            $group: {
                _id: '$reviewer',
                total: { $sum: 1 },
                feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
            }
        }
    ])

    let rejectionFeedback = await Rejection.aggregate([
        {
            $match: {
                $and: [
                    { reviewer: reviewer.id },
                    { guildId: reviewer.guildId },
                    { feedback: { $exists: true } }
                ]
            }
        },
        {
            $group: {
                _id: '$reviewer',
                total: { $sum: 1 },
                feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
            }
        }
    ])

    let feedbackCharsAverage = 0
    let feedbackWordsAverage = 0
    let complexityAverage = 0
    let qualityAverage = 0

    if (submissionFeedback[0] != undefined && rejectionFeedback[0] != undefined) {
        feedbackCharsAverage = (submissionFeedback[0].feedback_chars + rejectionFeedback[0].feedback_chars) / (submissionFeedback[0].total + rejectionFeedback[0].total)
        feedbackWordsAverage = (submissionFeedback[0].feedback_words + rejectionFeedback[0].feedback_words) / (submissionFeedback[0].total + rejectionFeedback[0].total)
    }

    if (averages[0] != undefined) {
        complexityAverage = averages[0].complexity_average
        qualityAverage = averages[0].quality_average
    }

    Reviewer.updateOne({
        id: reviewer.id,
        guildId: reviewer.guildId
    }, {
        $set: {
            complexityAvg: complexityAverage,
            qualityAvg: qualityAverage,
            feedbackCharsAvg: feedbackCharsAverage,
            feedbackWordsAvg: feedbackWordsAverage
        }
    })
}

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
    }).exec()

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
        ).exec()
    } else {
        // otherwise, reviewer already has stats so update the avgs and everything
        await updateReviewerAverages(reviewer)

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
        ).exec()
    }
}

/**
 * update reviewer doc for a declined review, add the feedback to their stats
 * @param reviewer
 * @param feedback
 */
async function updateReviewerForRejection(reviewer: ReviewerInterface, feedback: string) {
    // add feedback to the reviewer's avgs
    await updateReviewerAverages(reviewer)

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
    ).exec()
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
    }).exec()

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
    ).exec()

    // update old reviewer doc pt 2 because mongoose cant $set and $inc in 1 query
    await updateReviewerAverages(reviewer)
}

export { updateReviewerForAcceptance, updateReviewerForRejection, updateReviewerForPurge }
