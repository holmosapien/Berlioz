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

import {
    ChatHistoryContent,
    GenerativeRequest,
    SlackEventRecord,
} from 'lib/records'

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

        return new this(context, eventRecord)
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
        const generativeRequest: GenerativeRequest = await this.summarizeEventText()

        console.log('Summarized event:', generativeRequest.prompt)

        const gemini = new Gemini(history)
        const response = await gemini.generateContent(generativeRequest)

        let responseText = ''

        try {
            responseText = response.contentResult.response.text()
        }
        catch (error) {
            responseText = String(error)
        }

        console.log('Gemini response text:', responseText)

        return response
    }

    async summarizeEventText(): Promise<GenerativeRequest> {
        const generativeRequest: GenerativeRequest = {
            prompt: '',
        }

        let botUserId: string | null = null

        const integration = await SlackIntegration.fromId(this.context, this.slackIntegrationId)

        if (integration) {
            botUserId = integration.botUserId
        }

        this.event.event.blocks.forEach((block: any) => {
            if (block.type === 'rich_text') {
                block.elements.forEach((element: any) => {
                    if (element.type === 'rich_text_section') {
                        element.elements.forEach((subElement: any) => {
                            if ((subElement.type == 'user') && (subElement.user_id != botUserId)) {
                                generativeRequest.prompt += subElement.user_id
                            } else if (subElement.type == 'text') {
                                generativeRequest.prompt += subElement.text
                            }
                        })
                    }
                })
            }
        })

        /*
         * If there are files in the event, download them and encode them as base64.
         *
         */

        if (this.event.event.files && integration) {
            const firstFile = this.event.event.files[0]

            const {
                url_private: fileUrl,
                mimetype: mimeType,
            } = firstFile

            const contents = await fetch(fileUrl, {
                headers: {
                    'Authorization': `Bearer ${integration.accessToken}`,
                }
            })
                .then((response) => response.arrayBuffer())
                .then((arrayBuffer) => Buffer.from(arrayBuffer).toString("base64"))

            generativeRequest.media = {
                url: fileUrl,
                contents,
                mimeType,
            }
        }

        return generativeRequest
    }

    async markEventAsProcessed() {
        await markEventAsProcessed(this.context, this.id)
    }
}

export default SlackEvent