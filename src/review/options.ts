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
        description: 'feedback for submission (1000 chars max)',
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
            ['event', 2],
            ['landmark', 2],
            ['landmark & event', 4]
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
            ['small', 2],
            ['medium', 5],
            ['large', 10],
            ['monumental', 20]
        ],
        optionType: 'integer'
    },
    {
        name: 'quality',
        description: 'Quality',
        required: true,
        choices: [
            ['bleh', 1],
            ['decent', 1.5],
            ['very nice', 2]
        ],
        optionType: 'number'
    },
    {
        name: 'complexity',
        description: 'complexity',
        required: true,
        choices: [
            ['simple', 1],
            ['moderate', 1.5],
            ['super complex', 2]
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
            ['simple', 1],
            ['moderate', 1.5],
            ['super complex', 2]
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
            ['bleh', 1],
            ['decent', 1.5],
            ['very nice', 2]
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
            ['not complex lol', 1],
            ['kinda complex', 1.5],
            ['VERY COMPLEX', 2]
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
        description: 'Road distance (kilometers [sorry @ stupid imperial system americans])',
        required: true,
        optionType: 'number'
    },
    {
        name: 'quality',
        description: 'Quality',
        required: true,
        choices: [
            ['bleh', 1],
            ['decent', 1.5],
            ['very nice', 2]
        ],
        optionType: 'number'
    },
    {
        name: 'complexity',
        description: 'Complexity of road',
        required: true,
        choices: [
            ['flat road', 1],
            ['bit complex', 1.5],
            ['COMPLEX', 2]
        ],
        optionType: 'number'
    }
]

export { globalArgs, oneArgs, manyArgs, landArgs, roadArgs }
