import BerliozContext from 'lib/context'
import BerliozDatabasePool from 'lib/pool'
import SlackChat from 'lib/slack/chat'
import SlackEvent from 'lib/slack/event'
import SlackIntegration from 'lib/slack/integration'

import { GeneratedResponse } from 'lib/gemini'

const pool = new BerliozDatabasePool()

const context: BerliozContext = {
    pool,
    listenerHostname: process.env.BERLIOZ_LISTENER_HOSTNAME || 'localhost',
    downloadPath: process.env.BERLIOZ_DOWNLOAD_PATH || '/var/tmp',
}

const worker = async () => {
    let sleeping: boolean = false

    while (true) {
        const event = await SlackEvent.fromNextUnprocessed(context)

        if (event) {
            console.log('Processing event:', event.event)

            const {
                api_app_id: appId,
                event: {
                    channel,
                    event_ts: eventTimestamp,
                    thread_ts: threadTimestamp,
                },
            } = event.event

            const integration = await SlackIntegration.fromAppId(context, appId)

            if (!integration) {
                console.error('Failed to find integration')

                await event.markEventAsProcessed()

                continue
            }

            const timestamp = threadTimestamp || eventTimestamp
            const chat = await SlackChat.fromTimestamp(context, integration, channel, timestamp)

            let chatResponse: GeneratedResponse | null = null
            let responseText = ''

            try {
                chatResponse = await event.processEvent(chat.history)
                responseText = chatResponse.contentResult.response.text()
            }
            catch (error) {
                responseText = String(error)
            }

            const success = await chat.sendMessage(responseText)

            if (chatResponse) {
                await chat.updateHistory(chatResponse)

                if (success) {
                    await event.markEventAsProcessed()
                } else {
                    console.error('Failed to send message')
                }
            }

            sleeping = false
        } else {
            if (!sleeping) {
                console.log('No unprocessed events')

                sleeping = true
            }
        }

        await new Promise((resolve) => setTimeout(resolve, 5000))
    }
}

worker()