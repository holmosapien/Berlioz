import { Content } from '@google/generative-ai'

interface SlackClientRecord {
    id: number
    apiClientId: string
    apiClientSecret: string
    name: string
    created: string
}

interface AuthorizationStateRecord {
    stateId: number
    accountId: number
    slackClientRecord: SlackClientRecord
}

interface SlackIntegrationRecord {
    id: number
    accountId: number
    slackClientId: number
    teamId: string
    teamName: string
    botUserId: string
    accessToken: string
    appId: string
    created: string
}

interface SlackEventRecord {
    id: number
    slackIntegrationId: number
    event: any
    created: string
    processed: string | null
}

interface SlackChatRecord {
    id: number
    slackIntegrationId: number
    channelId: string
    timestamp: string
    rounds: SlackChatRoundRecord[]
    created: string
}

interface SlackChatRoundRecord {
    id: number
    slackChatId: number
    round: Content
    created: string
}

export {
    Content as ChatHistoryContent,

    SlackClientRecord,
    AuthorizationStateRecord,
    SlackIntegrationRecord,
    SlackEventRecord,
    SlackChatRecord,
    SlackChatRoundRecord,
}