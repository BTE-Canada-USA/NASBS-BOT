import Bot from '../struct/Client.js'
import Submission from '../struct/Submission.js'
import Builder from '../struct/Builder.js'

/**
 * standalone script to merge all users and submissions from one team into another
 * to run, modify the mergeFrom, mergeInto, and mergeFromName vars
 */
async function run() {
    // GUILD ID OF THE TEAM TO MERGE FROM AND MERGE INTO
    const mergeFrom = '12398712398712398127389213'
    const mergeInto = '12398712398712398127389213'
    const mergeFromName = 'used to be SE'

    const client = new Bot()
    console.log('starting..')
    await client.loadDatabase()

    // change all old submissions into new submissons
    const submissionResult = await Submission.updateMany(
        { guildId: mergeFrom },
        { guildId: mergeInto }
    )
    console.log(submissionResult)

    // change all old users into new users
    const users = await Builder.find({ guildId: mergeFrom })

    users.forEach(async (user) => {
        const userInOtherGuild = await Builder.findOne({ guildId: mergeInto, id: user.id })
        if (userInOtherGuild) {
            // if user already exists in new team
            // update new user to add old points
            console.log(userInOtherGuild)

            await Builder.updateOne(
                { guildId: mergeInto, id: user.id },
                {
                    $inc: {
                        pointsTotal: user.pointsTotal,
                        sqm: user.sqm || 0,
                        roadKMs: user.roadKMs || 0,
                        buildingCount: user.buildingCount || 0
                    }
                }
            )

            // "remove" old user
            // still exists in db just in case somehting messed up
            await Builder.updateOne(
                { guildId: mergeFrom, id: user.id },
                { guildId: `${mergeFromName}` }
            )
        }
        // otherwise, user does not exist in new yet so change their guildId to new to migrate them
        await Builder.updateOne({ guildId: mergeFrom, id: user.id }, { guildId: mergeInto })
    })
}

run()
