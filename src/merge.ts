import Bot from './struct/Client.js'
import Submission from './struct/Submission.js'
import Rejection from './struct/Rejection.js'
import mongoose from 'mongoose'

/**
 * standalone script to merge all users and submissions from one team into another
 * to run, modify the mergeFrom, mergeInto, and mergeFromName vars
 */
async function run(mergeFrom, mergeTo) {
    const client = new Bot()
    console.log('Starting merge..')
    await client.loadDatabase()

    // change all old submissions into new submissions
    await Submission.updateMany(
        { guildId: mergeFrom },
        { guildId: mergeTo }
    )

    await Rejection.updateMany(
        { guildId: mergeFrom },
        { guildId: mergeTo }
    )


    console.log('Finished')

    await mongoose.disconnect()
    client.destroy()
}


run(process.argv[2], process.argv[3])
