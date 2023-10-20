import Builder, { BuilderInterface } from '../struct/Builder.js'

/**
 * check db to see whether user has review dms enabled or not
 */
async function areDmsEnabled(userId: string) {
    const userData: BuilderInterface = await Builder.findOne({ id: userId }).lean()
    // userData.dm is blank by default, so check if its explicitly set false. otherwise it's true
    if (userData.dm == false) {
        return false
    } else {
        return true
    }
}

export default areDmsEnabled
