import { REST } from '@discordjs/rest'
import { Routes } from 'discord-api-types/v9'
import config from '../config.js'
import fs from 'fs'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'
import Command from './struct/Command.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dirPath = path.resolve(__dirname, './commands')

const commands = []
const commandFiles = fs.readdirSync(dirPath).filter((file) => file.endsWith('.ts'))

for (const file of commandFiles) {
    const commandImport = await import(`./commands/${file.replace('.ts', '.js')}`)
    const command: Command = commandImport.default
    commands.push(command.getData())
}

const rest = new REST({ version: '9' }).setToken(config.token)

;(async () => {
    try {
        console.log('Started refreshing global application (/) commands.')

        await rest.put(Routes.applicationCommands(config.clientId), {
            body: commands
        })

        console.log('Successfully reloaded global application (/) commands.')
    } catch (error) {
        console.error(error)
    }
})()
