import Rejection from '../struct/Rejection.js'
import Submission from '../struct/Submission.js'

/**
 * Check whether a submission has been accepted
 * @param {string} submissionId - The message id of the submission
 * @returns true if the submission is in the submissions db
 */
async function checkIfAccepted(submissionId: string) {
    const submission = await Submission.findOne({
        _id: submissionId
    }).lean()

    if (submission) {
        return true
    }
}

/**
 * Check whether a submission has been rejected
 * @param {string} submissionId - The message id of the submission
 * @returns true if the submission is in the rejections db
 */
async function checkIfRejected(submissionId: string) {
    const submission = await Rejection.findOne({
        _id: submissionId
    }).lean()

    if (submission) {
        return true
    }
}

export { checkIfAccepted, checkIfRejected }
