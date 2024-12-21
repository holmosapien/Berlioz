import { WebClient } from '@slack/web-api'
import slackify from 'slackify-markdown'

import BerliozContext from 'lib/context'
import SlackIntegration from 'lib/slack/integration'

import { saveSlackChat, getSlackChat, saveSlackChatRound } from 'lib/database'
import { GeneratedResponse } from 'lib/gemini'
import { SlackChatRecord, ChatHistoryContent } from 'lib/records'

class SlackChat {
    context: BerliozContext
    record: SlackChatRecord

    get id(): number {
        return this.record.id
    }

    get slackIntegrationId(): number {
        return this.record.slackIntegrationId
    }

    get channelId(): string {
        return this.record.channelId
    }

    get timestamp(): string {
        return this.record.timestamp
    }

    get history(): ChatHistoryContent[] {
        const history = this.record.rounds.map((round) => round.round)

        return history
    }

    constructor(context: BerliozContext, chatRecord: SlackChatRecord) {
        this.context = context
        this.record = chatRecord
    }

    static async fromTimestamp(context: BerliozContext, integration: SlackIntegration, channelId: string, timestamp: string): Promise<SlackChat> {
        const chatRecord = await getSlackChat(context, integration.id, channelId, timestamp)

        if (!chatRecord) {
            throw new Error('Failed to find chat')
        }

        return new this(context, chatRecord)
    }

    async sendMessage(message: string): Promise<boolean> {
        const integration = await SlackIntegration.fromId(this.context, this.slackIntegrationId)

        if (!integration) {
            throw new Error('Failed to find integration')
        }

        const client = new WebClient(integration.accessToken)
        const slackifiedMessage = slackify(message)

        const result = await client.chat.postMessage({
            channel: this.channelId,
            text: slackifiedMessage,
            thread_ts: this.timestamp,
        })

        return result.ok
    }

    async updateHistory(response: GeneratedResponse): Promise<void> {
        let historyLength = this.history.length

        if (!this.id) {
            const chatRecord = await saveSlackChat(
                this.context,
                this.slackIntegrationId,
                this.channelId,
                this.record.timestamp
            )

            this.record = chatRecord
        }

        /*
         * See if we can find which rounds haven't been saved yet.
         *
         * Let's start with a naive implementation: we'll assume
         * anything after the length of this.history is new.
         *
         */

        const newRounds = response.history.slice(historyLength)

        newRounds.forEach(async (round) => {
            await saveSlackChatRound(this.context, this.id, round)
        })
    }
}

export default SlackChat