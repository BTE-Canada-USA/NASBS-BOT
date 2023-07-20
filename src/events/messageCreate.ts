import Discord from 'discord.js'

export default async function execute(client, msg) {
    // ignore bot msgs
    if (msg.author.bot) {
        return
    }

    // production bot ignores test server, and test bot ignores other servers
    // theres probbaly beter way to write this statement but i dont like thinking
    if (
        (!client.test && msg.guild?.id == '935926834019844097') ||
        (client.test && msg.guild?.id != '935926834019844097')
    ) {
        return
    }

    const guild = client.guildsData.get(msg.guild.id)
    if (!guild) return

    // if msg is not in build-submit channel, ignore
    if (msg.channel.id != guild.submitChannel) {
        return
    }

    // otherwise, check each build-submit msg
    // check for images
    if (msg.attachments.size === 0) {
        return reject(client, msg, guild, 'NO IMAGE FOUND')
    }

    // split submission msg by each new line
    const lines = msg.content.split('\n')

    const coordsRegex =
        /^(\s*[(]?[-+]?([1-8]+\d\.(\d+)?|90(\.0+))\xb0?,?\s+[-+]?(180(\.0+)?|((1[0-7]\d)|([1-9]+\d))\.(\d+))\xb0?\s*)|(\s*(\d{1,3})\s*(?:°|d|º| |g|o)\s*([0-6]?\d)\s*(?:'|m| |´|’|′))/

    let coords = false
    let count = false

    // check content of each line of msg to see if one of them contains valid coordinates
    // msg could contain multiple lines due to notes, etc, so thats why check each line
    lines.forEach((line) => {
        line = line.replace(/#/g, '')
        if (coordsRegex.test(line) === true) {
            coords = true
        }
    })

    // reject submission if it doesn't include coords
    if (!coords) {
        reject(client, msg, guild, 'INVALID OR UNRECOGNIZED COORDINATES')
    }
}

// helper func that sends the rejection msg and deletes the submission
async function reject(client, msg, guild, reason) {
    const embed = new Discord.MessageEmbed()
        .setTitle(`INCORRECT SUBMISSION FORMAT: ${reason}`)
        .setDescription(
            `**[Correct format:](${guild.formattingMsg})**\n[Build count]\n[Coordinates]\n[Location name] (OPTIONAL)\n[Image(s) of build]\n\n__The entire submission must be in ONE MESSAGE!__\nView [pinned message](${guild.formattingMsg}) for more details.`
        )

    const rejectionMsg = await msg.channel.send({ embeds: [embed] })

    setTimeout(() => {
        rejectionMsg.delete()
        msg.delete()
    }, 30000)
}

export { execute }
