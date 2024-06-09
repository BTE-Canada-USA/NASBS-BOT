import Discord from 'discord.js'
import Command from '../struct/Command.js'
import { ReviewerInterface } from '../struct/Reviewer.js'
import Submission from '../struct/Submission.js'
import Rejection from '../struct/Rejection.js'
import { pagination, TypesButtons } from '@devraelfreeze/discordjs-pagination'

const ITEMS_PER_PAGE = 10
const MAX_SIZE = 50

export default new Command({
    name: 'audit',
    description: 'view reviewer stats.',
    reviewer: false,
    subCommands: [
        {
            name: 'leaderboard',
            description: 'reviewer leaderboard',
            args: [
                {
                    name: 'metric',
                    description: 'metric to rank reviewers by',
                    required: true,
                    choices: [
                        ['Reviews', 'reviews'],
                        ['Acceptances', 'acceptances'],
                        ['Rejections', 'rejections'],
                        ['FeedbackChars', 'feedbackCharsAvg'],
                        ['FeedbackWords', 'feedbackWordsAvg'],
                        ['Quality', 'qualityAvg'],
                        ['Complexity', 'complexityAvg']
                    ],
                    optionType: 'string'
                },
                {
                    name: 'global',
                    description: `Show reviewer leaderboard for all teams`,
                    required: false,
                    optionType: 'boolean'
                }
            ]
        },
        {
            name: 'individual',
            description: 'observe an individual reviewer',
            args: [
                {
                    name: 'user',
                    description: 'The reviewer',
                    required: true,
                    optionType: 'user'
                },
                {
                    name: 'global',
                    description: `Show stats for all teams`,
                    required: false,
                    optionType: 'boolean'
                }
            ]
        }
    ],

    async run(i, client) {
        const options = i.options
        let guild = client.guildsData.get(i.guild.id)
        const global = options.getBoolean('global')

        // leaderboard of reviewers by metric
        if (i.options.getSubcommand() == 'leaderboard') {
            const metric: string = options.getString('metric')

            let guildName: string

            let queryFilter = []

            if (global) {
                guildName = 'All Build Teams'
                guild = client.guildsData.get('global')
            } else {
                // for non-global, just find within this guild
                guildName = i.guild.name

                queryFilter = [{
                    $match: { guildId: i.guild.id }
                }]
            }

            let submissionQuery = await Submission.aggregate([
                ...queryFilter,
                {
                    $group: {
                        _id: '$reviewer',
                        acceptedCount: { $count: {} },
                        feedbackChars: { $sum: { $strLenCP: { $ifNull: ['$feedback', ''] } } },
                        feedbackWords: { $sum: { $size: { $ifNull: [{ $split: ['$feedback', ' '] }, []] } } },
                        qualityAverage: { $avg: '$quality' },
                        complexityAverage: { $avg: '$complexity' }
                    }
                }
            ])

            let rejectionQuery = await Rejection.aggregate([
                ...queryFilter,
                {
                    $group: {
                        _id: '$reviewer',
                        rejectionCount: { $count: {} },
                        feedbackChars: { $sum: { $strLenCP: { $ifNull: ['$feedback', ''] } } },
                        feedbackWords: { $sum: { $size: { $ifNull: [{ $split: ['$feedback', ' '] }, []] } } }
                    }
                }
            ])

            let finalCollection = {}

            submissionQuery.forEach((res) => {
                finalCollection[res._id] = {
                    acceptedCount: res.acceptedCount,
                    feedbackCharacters: res.feedbackChars,
                    feedbackWords: res.feedbackWords,
                    qualityAverage: res.qualityAverage,
                    complexityAverage: res.complexityAverage,
                    rejectedCount: 0
                }
            })

            rejectionQuery.forEach((res) => {
                if (!finalCollection[res._id]) {
                    finalCollection[res._id] = {
                        acceptedCount: 0,
                        feedbackCharacters: 0,
                        feedbackWords: 0,
                        qualityAverage: 0,
                        complexityAverage: 0
                    }
                }

                finalCollection[res._id].rejectedCount = res.rejectionCount
                finalCollection[res._id].feedbackCharacters += res.feedbackChars
                finalCollection[res._id].feedbackWords += res.feedbackWords
            })

            let leaderboard = []

            for (const [key, value] of Object.entries(finalCollection)) {
                let res = {
                    reviews: () => {
                        return value['acceptedCount'] + value['rejectedCount']
                    },
                    acceptances: () => {
                        return value['acceptedCount']
                    },
                    rejections: () => {
                        return value['rejectedCount']
                    },
                    feedbackCharsAvg: () => {
                        return value['feedbackCharacters'] / (value['acceptedCount'] + value['rejectedCount'])
                    },
                    feedbackWordsAvg: () => {
                        return value['feedbackWords'] / (value['acceptedCount'] + value['rejectedCount'])
                    },
                    qualityAvg: () => {
                        return value['qualityAverage']
                    },
                    complexityAvg: () => {
                        return value['complexityAverage']
                    }
                }

                leaderboard.push({ id: key, val: res[metric]().toFixed(2).replace(/[.,]00$/, '') })
            }

            leaderboard.sort((a, b) => {
                return b['val'] - a['val']
            })

            leaderboard = leaderboard.slice(0, MAX_SIZE)

            const pluralsMap = {
                reviews: 'reviews',
                acceptances: 'accepted reviews',
                rejections: 'rejected reviews',
                feedbackCharsAvg: 'characters averaged on feedback',
                feedbackWordsAvg: 'words averaged on feedback',
                qualityAvg: 'average quality reviewed',
                complexityAvg: 'average complexity reviewed'
            }

            let pages = []

            if (leaderboard.length == 0) {
                pages = [
                    new Discord.MessageEmbed()
                    .setTitle(`Doesn't look like any reviews have happened here!`)
                    .setDescription('')
                ]
            }

            for (let i = 0; i < Math.ceil(leaderboard.length / ITEMS_PER_PAGE); i++) {
                const startIndex = i * ITEMS_PER_PAGE
                const endIndex = startIndex + ITEMS_PER_PAGE
                const embed = new Discord.MessageEmbed()
                .setTitle(`${metric.charAt(0).toUpperCase() + metric.slice(1)} Leaderboard for ${guild.emoji} ${guildName} ${guild.emoji}`)
                .setDescription(leaderboard.map((element, index) => {
                    return `**${index + 1}.** <@${element.id}>: ${element.val} ${pluralsMap[metric]}`
                }).slice(startIndex, endIndex).join('\n\n'))

                pages.push(embed)
            }

            await pagination({
                embeds: pages,
                author: i.user,
                interaction: i,
                ephemeral: false,
                time: 60 * 1000,
                disableButtons: true,
                fastSkip: false,
                pageTravel: false,
                buttons: [
                    {
                        value: TypesButtons.previous,
                        label: 'Previous',
                        style: 'PRIMARY'
                    },
                    {
                        value: TypesButtons.next,
                        label: 'Next',
                        style: 'PRIMARY'
                    }
                ]
            })
        } else if (i.options.getSubcommand() == 'individual') {
            // ---------------------------------------------- INDIVIDUAL ----------------------------------------------
            const user = i.options.getUser('user')
            const userId = i.options.getUser('user').id
            let userData: ReviewerInterface
            let guildName: string

            if (global) {
                guild = client.guildsData.get('global')
                guildName = 'all build teams'

                let averages = await Submission.aggregate([
                    { $match: { reviewer: userId } },
                    {
                        $group: {
                            _id: '$reviewer',
                            quality_average: { $avg: '$quality' },
                            complexity_average: { $avg: '$complexity' }
                        }
                    }
                ])

                let submissionFeedback = await Submission.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { feedback: { $exists: true } }
                            ]
                        }
                    }, {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 },
                            feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                            feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
                        }
                    }
                ])

                let rejectionFeedback = await Rejection.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { feedback: { $exists: true } }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 },
                            feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                            feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
                        }
                    }
                ])

                let acceptanceCount = await Submission.aggregate([
                    { $match: { reviewer: userId } },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 }
                        }
                    }
                ])

                let rejectionCount = await Rejection.aggregate([
                    { $match: { reviewer: userId } },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 }
                        }
                    }
                ])

                let feedbackCharsAverage = (submissionFeedback[0].feedback_chars + rejectionFeedback[0].feedback_chars) / (submissionFeedback[0].total + rejectionFeedback[0].total)
                let feedbackWordsAverage = (submissionFeedback[0].feedback_words + rejectionFeedback[0].feedback_words) / (submissionFeedback[0].total + rejectionFeedback[0].total)

                userData = {} as ReviewerInterface
                userData.reviews = acceptanceCount[0].total + rejectionCount[0].total
                userData.acceptances = acceptanceCount[0].total
                userData.rejections = rejectionCount[0].total
                userData.feedbackCharsAvg = feedbackCharsAverage
                userData.feedbackWordsAvg = feedbackWordsAverage
                userData.qualityAvg = averages[0].quality_average
                userData.complexityAvg = averages[0].complexity_average

            } else {
                // get reviewer in current guild
                guildName = guild.name

                let averages = await Submission.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { guildId: guild.id }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: '$reviewer',
                            quality_average: { $avg: '$quality' },
                            complexity_average: { $avg: '$complexity' }
                        }
                    }
                ])

                let submissionFeedback = await Submission.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { guildId: guild.id },
                                { feedback: { $exists: true } }
                            ]
                        }
                    }, {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 },
                            feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                            feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
                        }
                    }
                ])

                let rejectionFeedback = await Rejection.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { guildId: guild.id },
                                { feedback: { $exists: true } }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 },
                            feedback_chars: { $sum: { $strLenCP: '$feedback' } },
                            feedback_words: { $sum: { $size: { $split: ['$feedback', ' '] } } }
                        }
                    }
                ])

                let acceptanceCount = await Submission.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { guildId: guild.id }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 }
                        }
                    }
                ])

                let rejectionCount = await Rejection.aggregate([
                    {
                        $match: {
                            $and: [
                                { reviewer: userId },
                                { guildId: guild.id }
                            ]
                        }
                    },
                    {
                        $group: {
                            _id: '$reviewer',
                            total: { $sum: 1 }
                        }
                    }
                ])

                let feedbackCharsAverage = (submissionFeedback[0].feedback_chars + rejectionFeedback[0].feedback_chars) / (submissionFeedback[0].total + rejectionFeedback[0].total)
                let feedbackWordsAverage = (submissionFeedback[0].feedback_words + rejectionFeedback[0].feedback_words) / (submissionFeedback[0].total + rejectionFeedback[0].total)

                userData = {} as ReviewerInterface
                userData.reviews = acceptanceCount[0].total + rejectionCount[0].total
                userData.acceptances = acceptanceCount[0].total
                userData.rejections = rejectionCount[0].total
                userData.feedbackCharsAvg = feedbackCharsAverage
                userData.feedbackWordsAvg = feedbackWordsAverage
                userData.qualityAvg = averages[0].quality_average
                userData.complexityAvg = averages[0].complexity_average
            }

            // return if user does not exist
            if (!userData) {
                return i.editReply({
                    embeds: [
                        new Discord.MessageEmbed().setDescription(
                            `\`${user.username}#${user.discriminator}\` is not a reviewer :frowning2: <:sad_cat:873457028981481473>`
                        )
                    ]
                })
            }

            await i.editReply({
                embeds: [
                    new Discord.MessageEmbed()
                    .setTitle(`REVIEW ME PLS :AHEGAO_PLEAD:`)
                    .setDescription(
                        `\`${user.username}#${user.discriminator}\` has :tada: ***${
                            userData.reviews
                        }***  :tada: reviews in ${guild.emoji} ${guildName} ${
                            guild.emoji
                        }!!\n\nNumber of acceptances: :white_check_mark: ***${
                            userData.acceptances || 0
                        }***  :white_check_mark: !!!\nNumber of rejections: :x: ***${
                            userData.rejections || 0
                        }***  :x:\nAverage feedback characters: :keyboard: ***${
                            userData.feedbackCharsAvg?.toFixed(3) || 0
                        }***  :keyboard:\nAverage feedback words: :pencil: ***${
                            userData.feedbackWordsAvg?.toFixed(3) || 0
                        }*** :pencil:\nAverage quality: :gem: ***${
                            userData.qualityAvg?.toFixed(3) || 0
                        }*** :gem:\nAverage complexity: :smiley_cat: ***${
                            userData.complexityAvg?.toFixed(3) || 0
                        }*** :smiley_cat:`
                    )
                    .setFooter({
                        text: 'average feedback calculations exclude any reviews without feedback.\nonly rejections after dec 24 2022 are recorded in database.'
                    })
                ]
            })
        }
    }
})
