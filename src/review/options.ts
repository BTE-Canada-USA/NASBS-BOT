import { CommandArg } from '../struct/Command.js'

// subcommand options
const globalArgs: CommandArg[] = [
    {
        name: 'submissionid',
        description: 'Submission msg id',
        required: true,
        optionType: 'string'
    },
    {
        name: 'feedback',
        description: 'feedback for submission (1700 chars max)',
        required: true,
        optionType: 'string'
    },
    {
        name: 'collaborators',
        description: 'Number of collaborators',
        required: false,
        optionType: 'integer'
    },
    {
        name: 'bonus',
        description: 'Event and landmark bonuses',
        choices: [
            ['Event', 2],
            ['Landmark', 2],
            ['Both Event and Landmark', 4],
            ['Focus', 1.5],
            ['Both Focus and Landmark', 3.5]
        ],
        required: false,
        optionType: 'integer'
    },
    {
        name: 'edit',
        description: 'Is this review an edit',
        choices: [
            ['edit', true],
            ['not edit', false]
        ],
        required: false,
        optionType: 'boolean'
    }
]

const oneArgs: CommandArg[] = [
    {
        name: 'size',
        description: 'Building size',
        required: true,
        choices: [
            ['Small', 2],
            ['Medium', 5],
            ['Large', 10],
            ['Monumental', 20]
        ],
        optionType: 'integer'
    },
    {
        name: 'quality',
        description: 'Quality',
        required: true,
        choices: [
            ['Low', 1],
            ['Medium', 1.5],
            ['High', 2]
        ],
        optionType: 'number'
    },
    {
        name: 'complexity',
        description: 'complexity',
        required: true,
        choices: [
            ['Simple', 1],
            ['Moderate', 1.5],
            ['Difficult', 2]
        ],
        optionType: 'number'
    }
]

const manyArgs: CommandArg[] = [
    {
        name: 'smallamt',
        description: 'Number of small buildings',
        required: true,
        optionType: 'integer'
    },
    {
        name: 'mediumamt',
        description: 'Number of medium buildings',
        required: true,
        optionType: 'integer'
    },
    {
        name: 'largeamt',
        description: 'Number of large buildings',
        required: true,
        optionType: 'integer'
    },
    {
        name: 'avgquality',
        description: 'Avg build quality from 1-2',
        required: true,
        optionType: 'number'
    },
    {
        name: 'avgcomplexity',
        description: 'average complexity from 1-2',
        required: true,
        choices: [
            ['Simple', 1],
            ['Moderate', 1.5],
            ['Difficult', 2]
        ],
        optionType: 'number'
    }
]

const landArgs: CommandArg[] = [
    {
        name: 'sqm',
        description: 'Land size in square meters',
        required: true,
        optionType: 'number'
    },
    {
        name: 'quality',
        description: 'Quality',
        required: true,
        choices: [
            ['Low', 1],
            ['Medium', 1.5],
            ['High', 2]
        ],
        optionType: 'number'
    },
    {
        name: 'landtype',
        description: 'Type of land',
        required: true,
        choices: [
            ['Tier 1', 8],
            ['Tier 2', 10],
            ['Tier 3', 15]
        ],
        optionType: 'integer'
    },
    {
        name: 'complexity',
        description: 'Complexity of land',
        required: true,
        choices: [
            ['Simple', 1],
            ['Moderate', 1.5],
            ['Difficult', 2]
        ],
        optionType: 'number'
    }
]

const roadArgs: CommandArg[] = [
    {
        name: 'roadtype',
        description: 'Type of road',
        required: true,
        choices: [
            ['Standard', 2],
            ['Advanced', 10]
        ],
        optionType: 'number'
    },
    {
        name: 'distance',
        description: 'Road distance in kilometers',
        required: true,
        optionType: 'number'
    },
    {
        name: 'quality',
        description: 'Quality',
        required: true,
        choices: [
            ['Low', 1],
            ['Medium', 1.5],
            ['High', 2]
        ],
        optionType: 'number'
    },
    {
        name: 'complexity',
        description: 'Complexity of road',
        required: true,
        choices: [
            ['Simple', 1],
            ['Moderate', 1.5],
            ['Difficult', 2]
        ],
        optionType: 'number'
    }
]

export { globalArgs, oneArgs, manyArgs, landArgs, roadArgs }
