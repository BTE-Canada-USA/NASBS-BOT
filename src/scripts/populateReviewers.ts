import Rejection, { RejectionInterface } from '../struct/Rejection.js'
import Reviewer from '../struct/Reviewer.js'
import tempReviewer, { tempReviewerInterface } from './ReviewerA.js'
import Submission, { SubmissionInterface } from '../struct/Submission.js'
import config from '../../config.js'
import Bot from '../struct/Client.js'

function countWords(string: string) {
    const arr = string.split(' ')
    return arr.filter((word) => word !== '').length
}

/**
 * standalone script used to populate the reviewers db using the submissions
 */
async function run() {
    const client = new Bot()
    console.log('starting..')
    await client.loadDatabase()

    // for every submission,
    // update the corresponding reviewer:
    // increment reviews, rejections, etc

    const submissions: SubmissionInterface[] = await Submission.find({})

    for await (const submission of submissions) {
        let hasFeedback = 0
        if (submission.feedback) {
            hasFeedback = 1
        }

        await tempReviewer
            .updateOne(
                { id: submission.reviewer, guildId: submission.guildId },
                {
                    $inc: {
                        reviews: 1,
                        reviewsWithFeedback: hasFeedback,
                        acceptances: 1,
                        feedbackChars: submission.feedback?.length || 0,
                        feedbackWords: countWords(submission.feedback || ''),
                        quality: submission.quality,
                        complexity: submission.complexity
                    }
                },
                { upsert: true }
            )
            .lean()
    }

    console.log('done submision!ss!!')

    // same for rejections
    const rejections: RejectionInterface[] = await Rejection.find({})

    for await (const rejection of rejections) {
        await tempReviewer
            .updateOne(
                { id: rejection.reviewer, guildId: rejection.guildId },
                {
                    $inc: {
                        reviews: 1,
                        rejections: 1,
                        reviewsWithFeedback: 1,
                        feedbackChars: rejection.feedback?.length || 0,
                        feedbackWords: countWords(rejection.feedback || '')
                    }
                },
                { upsert: true }
            )
            .lean()
    }

    // after totals are done, calculate avg
    console.log('done part 1')
    const reviewerTotals: tempReviewerInterface[] = await tempReviewer.find({})
    for await (const reviewer of reviewerTotals) {
        try {
            await Reviewer.updateOne(
                { id: reviewer.id, guildId: reviewer.guildId },
                {
                    $set: {
                        reviews: reviewer.reviews,
                        reviewsWithFeedback: reviewer.reviewsWithFeedback || 0,
                        rejections: reviewer.rejections || 0,
                        acceptances: reviewer.acceptances || 0,
                        feedbackCharsAvg:
                            reviewer.feedbackChars / reviewer.reviewsWithFeedback || 0,
                        feedbackWordsAvg:
                            reviewer.feedbackWords / reviewer.reviewsWithFeedback || 0,
                        qualityAvg: reviewer.quality / reviewer.acceptances || 0,
                        complexityAvg: reviewer.complexity / reviewer.acceptances || 0
                    }
                },
                { upsert: true }
            ).lean()
        } catch (e) {
            console.log(e)
            console.log(reviewer)
        }
    }
    console.log('done everything')
}

run()
