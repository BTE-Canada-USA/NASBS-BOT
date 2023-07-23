import Discord, { CommandInteraction, GuildMember } from 'discord.js'
import areDmsEnabled from '../utils/areDmsEnabled.js'
import { GuildInterface } from '../struct/Guild.js'

async function sendDm(
    member: GuildMember,
    guildData: GuildInterface,
    reply: string,
    i: CommandInteraction
) {
    // after updating db, send dm (does this for edits and initial reviews)
    // send dm if user has it enabled
    const dmsEnabled = await areDmsEnabled(member.id)

    if (dmsEnabled && member) {
        const dm = await member.createDM()
        await dm
            .send({
                embeds: [
                    new Discord.MessageEmbed()
                        .setTitle(`${guildData.emoji} Build reviewed! ${guildData.emoji}`)
                        .setDescription(`You ${reply}`)
                        .setFooter({
                            text: `Use the cmd '/preferences' to toggle build review DMs.`
                        })
                ]
            })
            .catch((err) => {
                console.log(err)
                i.followUp(
                    `\`${member.user.username}#${member.user.discriminator}\` has dms turned off or something went wrong while sending the dm! ${err}`
                )
            })
    }
}

export { sendDm }
