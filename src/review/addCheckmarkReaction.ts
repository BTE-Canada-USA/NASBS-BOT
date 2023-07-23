import { Message, MessageReaction } from 'discord.js'

async function addCheckmarkReaction(submissionMsg: Message) {
    // Remove all bot reactions, then add a '✅' reaction
    submissionMsg.reactions.cache.forEach((reaction: MessageReaction) => reaction.remove())
    await submissionMsg.react('✅')
}

export { addCheckmarkReaction }
