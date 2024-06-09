import Bot from '../struct/Client.js'
import { CommandInteraction } from 'discord.js'

export default async function execute(client: Bot, interaction: CommandInteraction) {
    if (
        (!client.test && interaction.guild?.id == '935926834019844097') ||
        (client.test && interaction.guild?.id != '935926834019844097')
    )
        return

    if (!interaction.isCommand()) return

    if (!interaction.guild) {
        return interaction.reply('Commands must be used in servers.')
    }

    const guildData = client.guildsData.get(interaction.guild.id)
    if (!guildData) return interaction.reply('This server is not registered')

    const command = client.commands.get(interaction.commandName)
    if (!command) return

    try {
        if (command.reviewer == true) {
            const member = await interaction.guild.members.fetch(interaction.user.id)
            if (!member.roles.cache.has(guildData.reviewerRole)) {
                return await interaction.reply(
                    'You do not have permission to use this command.'
                )
            }
        }

        await interaction.deferReply()

        command.run(interaction, client)
        
    } catch (err) {
        console.log(err)
    }
}
