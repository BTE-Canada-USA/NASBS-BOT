import mongoose from 'mongoose'

const tempReviewer = mongoose.model<tempReviewerInterface>(
    'Uwu',
    new mongoose.Schema<tempReviewerInterface>({
        id: String,
        guildId: String,
        reviews: Number,
        reviewsWithFeedback: Number,
        rejections: Number,
        acceptances: Number,
        feedbackWords: Number,
        feedbackChars: Number,
        quality: Number,
        complexity: Number
    })
)

export interface tempReviewerInterface {
    id: string
    guildId: string
    reviews: number
    reviewsWithFeedback: number
    rejections: number
    acceptances: number
    feedbackWords: number
    feedbackChars: number
    quality: number
    complexity: number
}

export default tempReviewer
