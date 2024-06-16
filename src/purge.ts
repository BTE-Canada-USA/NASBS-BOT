import Bot from './struct/Client.js'
import Submission from './struct/Submission.js'
import Rejection from './struct/Rejection.js'
import mongoose from 'mongoose'
import Builder from './struct/Builder.js'
import Reviewer from './struct/Reviewer.js'

/**
 * standalone script to merge all users and submissions from one team into another
 * to run, modify the mergeFrom, mergeInto, and mergeFromName vars
 */
async function run(purgeFrom) {
    const client = new Bot()
    console.log('Starting purge..')
    await client.loadDatabase()

    // change all old submissions into new submissions
    await Submission.deleteMany(
        { guildId: purgeFrom }
    )

    await Rejection.deleteMany(
        { guildId: purgeFrom }
    )

    await Builder.deleteMany(
        { guildId: purgeFrom }
    )

    await Reviewer.deleteMany(
        { guildId: purgeFrom }
    )


    console.log('Finished')

    await mongoose.disconnect()
    client.destroy()
}


run(process.argv[2])
