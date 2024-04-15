import Bot from './struct/Client.js'
import config from '../config.js'

async function start() {
    const client = new Bot()
    console.log('NABS Bot Starting..')
    await client.login(config.token)
    await client.loadCommands()
    await client.loadEvents()
    await client.loadDatabase()
    await client.loadGuilds()
    console.log('NABS Bot Started')
}

start()
