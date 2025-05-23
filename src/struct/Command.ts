import { SlashCommandBuilder, SlashCommandSubcommandBuilder } from '@discordjs/builders'
import { CommandInteraction, Interaction } from 'discord.js'
import Bot from './Client.js'

class Command {
    name: string
    description: string
    reviewer: boolean
    args?: CommandArg[]
    subCommands?: SubCommandProperties[]
    cooldown?: number
    run: (i: CommandInteraction, client: Bot) => void

    constructor(properties: CommandProperties) {
        this.name = properties.name
        this.description = properties.description
        this.reviewer = properties.reviewer
        this.args = properties.args
        this.subCommands = properties.subCommands
        this.cooldown = properties.cooldown || 500
        this.run = properties.run
    }

    getData() {
        const Builder = new SlashCommandBuilder()
            .setName(this.name)
            .setDescription(this.description)
        if (this.args) {
            addOptions(this.args, Builder)
        }

        if (this.subCommands) {
            this.subCommands.forEach((subCmd) => {
                const SubCommandBuilder = new SlashCommandSubcommandBuilder()
                SubCommandBuilder.setName(subCmd.name).setDescription(subCmd.description)
                if (subCmd.args) {
                    addOptions(subCmd.args, SubCommandBuilder)
                }
                Builder.addSubcommand(SubCommandBuilder)
            })
        }

        function addOptions(options, builder) {
            options.forEach((opt) => {
                let choices = []
                if (Array.isArray(opt.choices)) {
                    choices = opt.choices.map(([name, value]) => ({name, value}))
                }

                if (opt.optionType == 'string') {
                    builder.addStringOption((option) =>
                        option
                            .setName(opt.name)
                            .setDescription(opt.description)
                            .setChoices(...choices)
                            .setRequired(opt.required)
                    )
                } else if (opt.optionType == 'number') {
                    builder.addNumberOption((option) =>
                        option
                            .setName(opt.name)
                            .setDescription(opt.description)
                            .setChoices(...choices)
                            .setRequired(opt.required)
                    )
                } else if (opt.optionType == 'integer') {
                    builder.addIntegerOption((option) =>
                        option
                            .setName(opt.name)
                            .setDescription(opt.description)
                            .setChoices(...choices)
                            .setRequired(opt.required)
                    )
                } else if (opt.optionType == 'user') {
                    builder.addUserOption((option) =>
                        option
                            .setName(opt.name)
                            .setDescription(opt.description)
                            .setRequired(opt.required)
                    )
                } else if (opt.optionType == 'boolean') {
                    builder.addBooleanOption((option) =>
                        option
                            .setName(opt.name)
                            .setDescription(opt.description)
                            .setRequired(opt.required)
                    )
                }
            })
        }
        return Builder
    }
}

export interface CommandArg {
    name: string
    description: string
    choices?: (string | number | boolean)[][]
    required: boolean
    optionType:
        | 'string'
        | 'integer'
        | 'number'
        | 'boolean'
        | 'user'
        | 'channel'
        | 'role'
        | 'mentionable'
        | 'attachment'
}

interface SubCommandProperties {
    name: string
    description: string
    args?: CommandArg[]
}

interface CommandProperties extends SubCommandProperties {
    reviewer?: boolean
    subCommands?: SubCommandProperties[]
    cooldown?: number
    run: (i: CommandInteraction, client: Bot) => void
}

export default Command
