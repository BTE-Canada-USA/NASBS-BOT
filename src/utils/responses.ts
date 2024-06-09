import Discord from 'discord.js'

module Responses {

    // SUBMISSION AREA

    export function invalidSubmissionID(interaction, submissionID) {
        return embed(interaction, `'${submissionID}' is not a valid message ID from the build submit channel.`)
    }

    export function submissionHasAlreadyBeenAccepted(interaction) {
        return embed(interaction, `That submission has already been accepted.`)
    }

    export function submissionHasAlreadyBeenDeclined(interaction) {
        return embed(interaction, `That submission has already been rejected.`)
    }

    export function submissionHasNotBeenReviewed(interaction) {
        return embed(interaction, `That submission has not been reviewed yet.`)
    }

    export function submissionNotFound(interaction) {
        return embed(interaction, `Could not find a submission with that ID.`)
    }

    export function submissionRejected(interaction, feedback, url) {
        return embed(interaction,
            `Submission has been rejected.
            \`${feedback}\`
            __[Submission link](<${url}>)__`
        )
    }

    export function submissionPurged(interaction, link) {
        return embed(interaction, `Submission has been purged. ${link}`)
    }

    export function submissionPermissionDenied(interaction) {
        return embed(interaction, `You cannot review a submission you submitted.`)
    }

    //

    export function purgePermissionDenied(interaction) {
        return embed(interaction, `That submission belongs to another server, and you do not have permission to purge it.`)
    }

    // ERROR AREA

    export function errorDirectMessaging(interaction, error) {
        return embed(interaction, `Something went wrong while sending the dm: ${error}`)
    }

    export function errorGeneric(interaction, error) {
        return embed(interaction, `Something went wrong: ${error}`)
    }

    //

    export function noCompletedBuilds(interaction, username) {
        return embed(interaction, `\`${username}\` has no completed builds!`)
    }

    export function points(interaction, userID, points, buildings, landMeters, roadKMs, emoji, guildName) {
        return embed(interaction,
            `<@${userID}> has :tada: ***${formatNumber(points)}***  :tada: points in ${emoji} ${guildName} ${emoji}!!
            
            Number of buildings: :house: ***${buildings}***  :house:
            Sqm of land: :corn: ***${formatNumber(landMeters)}***  :corn:
            Kilometers of roads: :motorway: ***${formatNumber(roadKMs)}***  :motorway:`,
            `Points`
        )
    }

    export function serverCompletedBuilds(interaction, numberBuilds) {
        return embed(interaction,
            `This server has ${numberBuilds} completed buildings.`,
            `Server Progress`
        )
    }

    export function feedbackSent(interaction, feedback, url) {
        return embed(interaction,
            `Feedback sent.
            \`${feedback}\`
            __[Submission link](<${url}>)__`
        )
    }

    export function dmPreferenceUpdated(interaction, value) {
        return embed(interaction, `DM preference set to ${value ? 'enabled' : 'disabled'}`)
    }

    // UTIL AREA

    export function embed(interaction, message, title = '') {
        return interaction.editReply(createEmbed(message, title))
    }

    export function createEmbed(message, title = '') {
        if (title != '') return createEmbedWithTitle(title, message)

        return { embeds: [new Discord.MessageEmbed().setDescription(message)] }
    }

    function createEmbedWithTitle(title, message) {
        return { embeds: [new Discord.MessageEmbed().setTitle(title).setDescription(message)] }
    }

    function formatNumber(num) {
        return num.toFixed(2).replace(/[.,]00$/, '')
    }
}

export default Responses