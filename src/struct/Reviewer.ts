import mongoose from 'mongoose'

const Reviewer = mongoose.model<ReviewerInterface>(
    'Reviewer',
    new mongoose.Schema<ReviewerInterface>({
        id: String,
        guildId: String,
        reviews: Number,
        reviewsWithFeedback: Number,
        rejections: Number,
        acceptances: Number,
        feedbackWordsAvg: Number,
        feedbackCharsAvg: Number,
        qualityAvg: Number,
        complexityAvg: Number
    })
)

export interface ReviewerInterface {
    id: string
    guildId: string
    reviews: number
    reviewsWithFeedback: number
    rejections: number
    acceptances: number
    feedbackWordsAvg: number
    feedbackCharsAvg: number
    qualityAvg: number
    complexityAvg: number
}

export default Reviewer
