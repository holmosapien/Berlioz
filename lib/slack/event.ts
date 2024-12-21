import BerliozContext from 'lib/context'
import Gemini from 'lib/gemini'
import SlackIntegration from 'lib/slack/integration'

import {
    saveEvent,
    getNextUnprocessedEvent,
    markEventAsProcessed,
} from 'lib/database'

import {
    GeneratedResponse,
} from 'lib/gemini'

import { SlackEventRecord, ChatHistoryContent } from 'lib/records'

interface SummarizedSlackEvent {
    prompt: string
    media?: string
}

class SlackEvent {
    context: BerliozContext
    record: SlackEventRecord

    get id(): number {
        return this.record.id
    }

    get slackIntegrationId(): number {
        return this.record.slackIntegrationId
    }

    get event(): any {
        return this.record.event
    }

    get created(): string {
        return this.record.created
    }

    get processed(): string | null {
        return this.record.processed
    }

    constructor(context: BerliozContext, slackEventRecord: SlackEventRecord) {
        this.context = context
        this.record = slackEventRecord
    }

    static async fromEventBody(context: BerliozContext, event: any): Promise<SlackEvent> {
        const {
            api_app_id: appId,
            event: {
                ts: timestamp,
            },
        } = event

        const integration = await SlackIntegration.fromAppId(context, appId)

        if (!integration) {
            throw new Error('Failed to find integration')
        }

        const created = new Date(Number(timestamp) * 1000).toISOString()

        const eventRecord: SlackEventRecord = {
            id: 0,
            slackIntegrationId: integration.id,
            event,
            created,
            processed: null,
        }

        return new SlackEvent(context, eventRecord)
    }

    static async fromNextUnprocessed(context: BerliozContext): Promise<SlackEvent | null> {
        const event = await getNextUnprocessedEvent(context)

        if (!event) {
            return null
        }

        return new this(context, event)
    }

    async saveEvent() {
        await saveEvent(this.context, this.slackIntegrationId, this.event)
    }

    async processEvent(history: ChatHistoryContent[]): Promise<GeneratedResponse> {
        const summarizedEvent: SummarizedSlackEvent = this.summarizeEventText()

        console.log('Summarized event:', summarizedEvent.prompt)

        const gemini = new Gemini(history)
        const response = await gemini.generateContent(summarizedEvent.prompt)
        const responseText = response.contentResult.response.text()

        console.log('Gemini response text:', responseText)

        return response
    }

    summarizeEventText(): SummarizedSlackEvent {
        const summarizedEvent: SummarizedSlackEvent = {
            prompt: '',
        }

        this.event.event.blocks.forEach((block: any) => {
            if (block.type === 'rich_text') {
                block.elements.forEach((element: any) => {
                    if (element.type === 'rich_text_section') {
                        element.elements.forEach((subElement: any) => {
                            if (subElement.type == 'user') {
                                summarizedEvent.prompt += subElement.user_id
                            } else if (subElement.type == 'text') {
                                summarizedEvent.prompt += subElement.text
                            }
                        })
                    }
                })
            }
        })

        return summarizedEvent
    }

    async markEventAsProcessed() {
        await markEventAsProcessed(this.context, this.id)
    }
}

export default SlackEvent

export {
    SummarizedSlackEvent,
}