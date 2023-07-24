import Discord, { MessageActionRow, MessageButton } from 'discord.js'
import Command from '../struct/Command.js'
import Reviewer, { ReviewerInterface } from '../struct/Reviewer.js'

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
            const pageLength = 10
            let page = 1
            let reviewers
            let guildName: string

            if (global) {
                guildName = 'all build teams'
                guild = client.guildsData.get('global')

                // if metric is one that needs to be averaged, do that
                // for feedback, average by total reviewsWithFeedback
                if (metric == 'feedbackChars' || metric == 'feedbackWords') {
                    reviewers = await Reviewer.aggregate([
                        {
                            $group: {
                                _id: '$id',
                                metricTotal: { $sum: `$${metric}` },
                                divideBy: {
                                    $sum: {
                                        $cond: {
                                            if: { $gt: ['$reviewsWithFeedback', 0] },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $set: {
                                globalAvg: {
                                    // when dividing by number of servers, make sure its more than 0 for those with no acceptances/withfeedbacks
                                    $divide: [
                                        '$metricTotal',
                                        {
                                            $cond: {
                                                if: { $eq: ['$divideBy', 0] },
                                                then: 1,
                                                else: '$divideBy'
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        { $sort: { globalAvg: -1 } }
                    ])
                } else if (metric == 'qualityAvg' || metric == 'complexityAvg') {
                    // for quality/complx, average by total acceptances
                    reviewers = await Reviewer.aggregate([
                        {
                            $group: {
                                _id: '$id',
                                metricTotal: { $sum: `$${metric}` },
                                // every time a user is grouped again, increment this by 1 so the total average is sum of [metric] / n reviewer guild instances
                                // but make sure it even has acceptances in that guild, otherwise we cant possibly be adding any quality/complexity from it
                                divideBy: {
                                    $sum: {
                                        $cond: {
                                            if: { $gt: ['$acceptances', 0] },
                                            then: 1,
                                            else: 0
                                        }
                                    }
                                }
                            }
                        },
                        {
                            $set: {
                                count: {
                                    $divide: [
                                        '$metricTotal',
                                        {
                                            $cond: {
                                                if: { $eq: ['$divideBy', 0] },
                                                then: 1,
                                                else: '$divideBy'
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                        { $sort: { count: -1 } }
                    ])
                } else {
                    // otherwise, just add the total sum because no stupid averaging needed
                    reviewers = await Reviewer.aggregate([
                        {
                            $group: {
                                _id: '$id',
                                count: { $sum: `$${metric}` }
                            }
                        },
                        { $sort: { count: -1 } }
                    ])
                }
            } else {
                // for non-global, just find within this guild
                guildName = guild.name

                reviewers = await Reviewer.aggregate([
                    { $match: { guildId: guild.id } },
                    {
                        $group: {
                            _id: '$id',
                            count: { $sum: `$${metric}` }
                        }
                    },
                    { $sort: { count: -1 } }
                ])
            }
            const maxPage = Math.ceil(reviewers.length / pageLength)

            // make buttons
            const previousButton = new MessageButton()
                .setCustomId('previous')
                .setLabel('Previous page 🔙')
                .setStyle('PRIMARY')

            const nextButton = new MessageButton()
                .setCustomId('next')
                .setLabel('Next page ➡')
                .setStyle('PRIMARY')

            // create the embed for a page of leaderboard
            async function makeEmbed(page) {
                let content = ''

                for (let l = page * pageLength - pageLength; l < page * pageLength; l++) {
                    if (!reviewers[l]) break

                    // round the value to 3 decimal
                    const value = (() => {
                        if (/[\.]/.test(reviewers[l].count)) {
                            // if the value is a float
                            return parseFloat(reviewers[l].count).toFixed(3)
                        } else {
                            // if the value is an int
                            return reviewers[l].count
                        }
                    })()

                    // if value is 0, leave because we're at the end of ppl with actual stats
                    if (value == 0) {
                        break
                    }

                    // get user to display their username/#
                    const user = await client.users.fetch(reviewers[l]._id)

                    // add the next line to this page's msg content
                    content += `**${l + 1}.** \`${user.username}#${
                        user.discriminator
                    }\`: ${value}\n\n`
                }

                const embed = new Discord.MessageEmbed()
                    .setTitle(
                        `${metric} leaderboard for  ${guild.emoji} ${guildName} ${guild.emoji}!`
                    )
                    .setDescription(content)

                return embed
            }

            // reply with page 1 and next button
            // if there's only 1 leaderboard page, no buttons
            // use less than one, because an empty leaderboard has no pages
            if (maxPage <= 1) {
                await i.reply({
                    embeds: [await makeEmbed(page)]
                })
            } else {
                // otherwise, add a next button
                await i.reply({
                    embeds: [await makeEmbed(1)],
                    components: [new MessageActionRow().addComponents(nextButton)]
                })
            }

            const reply = await i.fetchReply()
            const replyMsg = await i.channel.messages.fetch(reply.id)

            const filter = (button) =>
                button.customId == 'previous' || button.customId == 'next'

            // listen for button pressed
            function buttonListener() {
                replyMsg
                    .awaitMessageComponent({
                        filter,
                        time: 12 * 60 * 60 * 1000
                    })
                    // when button is pressed, update the embed and page value accordingly, then start another listener
                    .then(async (i) => {
                        if (i.customId == 'previous') {
                            page -= 1
                            // no previous button allowed if its the 1st page (or negative page, error or empty leaderboard)
                            if (page <= 1) {
                                await i.update({
                                    embeds: [await makeEmbed(page)],
                                    components: [
                                        new MessageActionRow().addComponents(nextButton)
                                    ]
                                })
                            } else {
                                await i.update({
                                    embeds: [await makeEmbed(page)],
                                    components: [
                                        new MessageActionRow().addComponents(
                                            previousButton,
                                            nextButton
                                        )
                                    ]
                                })
                            }
                        } else if (i.customId == 'next') {
                            page += 1
                            // no next button allowed if its the last page
                            if (page == maxPage) {
                                await i.update({
                                    embeds: [await makeEmbed(page)],
                                    components: [
                                        new MessageActionRow().addComponents(previousButton)
                                    ]
                                })
                            } else {
                                await i.update({
                                    embeds: [await makeEmbed(page)],
                                    components: [
                                        new MessageActionRow().addComponents(
                                            previousButton,
                                            nextButton
                                        )
                                    ]
                                })
                            }
                        }
                        buttonListener()
                    })
                    .catch((err) => {
                        return err
                    })
            }
            buttonListener()
        } else if (i.options.getSubcommand() == 'individual') {
            // ---------------------------------------------- INDIVIDUAL ----------------------------------------------
            const user = i.options.getUser('user')
            const userId = i.options.getUser('user').id
            let userData: ReviewerInterface
            let guildName: string

            if (global) {
                guild = client.guildsData.get('global')
                guildName = 'all build teams'

                const results = await Reviewer.aggregate([
                    { $match: { id: userId } },
                    {
                        $group: {
                            _id: '$id',
                            reviews: { $sum: '$reviews' },
                            acceptances: { $sum: '$acceptances' },
                            rejections: { $sum: '$rejections' },
                            reviewsWithFeedback: { $sum: '$reviewsWithFeedback' },
                            feedbackCharsAvgTotal: { $sum: '$feedbackCharsAvg' },
                            feedbackWordsAvgTotal: { $sum: '$feedbackWordsAvg' },
                            qualityAvgTotal: { $sum: '$qualityAvg' },
                            complexityAvgTotal: { $sum: '$complexityAvg' },
                            divideBy: { $sum: 1 }
                        }
                    },
                    {
                        $set: {
                            feedbackCharsAvg: {
                                $divide: ['$feedbackCharsAvgTotal', '$divideBy']
                            },
                            feedbackWordsAvg: {
                                $divide: ['$feedbackWordsAvgTotal', '$divideBy']
                            },
                            qualityAvg: {
                                $divide: ['$qualityAvgTotal', '$divideBy']
                            },
                            complexityAvg: {
                                $divide: ['$complexityAvgTotal', '$divideBy']
                            }
                        }
                    }
                ])

                userData = results[0]
            } else {
                // get reviewer in current guild
                guildName = guild.name
                userData = await Reviewer.findOne({
                    id: userId,
                    guildId: guild.id
                }).lean()
            }

            // return if user does not exist
            if (!userData) {
                return i.reply({
                    embeds: [
                        new Discord.MessageEmbed().setDescription(
                            `\`${user.username}#${user.discriminator}\` is not a reviewer :frowning2: <:sad_cat:873457028981481473>`
                        )
                    ]
                })
            }

            await i.reply({
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
