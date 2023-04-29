import mongoose from 'mongoose'

const Builder = mongoose.model<BuilderInterface>(
    'Builder',
    new mongoose.Schema<BuilderInterface>({
        id: String,
        guildId: String,
        dm: Boolean,
        pointsTotal: Number,
        buildingCount: Number,
        roadKMs: Number,
        sqm: Number
    })
)

export interface BuilderInterface {
    id: string
    guildId: string
    dm: boolean
    pointsTotal: number
    buildingCount: number
    roadKMs: number
    sqm: number
}

export default Builder
