import bodyParser from 'body-parser'
import { IncomingMessage, ServerResponse } from 'http'

import express, {
    Express,
    NextFunction,
    Response,
    Request,
} from 'express'

import BerliozContext from 'lib/context'
import BerliozDatabasePool from 'lib/pool'
import SlackAuthorization from 'lib/slack/authorization'
import SlackEvent from 'lib/slack/event'

declare module 'http' {
    interface IncomingMessage {
        rawBody: string
    }
}

const app: Express = express()
const port: number = 12030

const pool = new BerliozDatabasePool()

const ctx: BerliozContext = {
    pool,
    listenerHostname: process.env.BERLIOZ_LISTENER_HOSTNAME || 'localhost',
    downloadPath: process.env.BERLIOZ_DOWNLOAD_PATH || '/var/tmp',
}

app.use(bodyParser.json({
    verify: (req: IncomingMessage, res: ServerResponse<IncomingMessage>, buffer: Buffer<ArrayBufferLike>) => {
        req.rawBody = buffer.toString('utf8')
    }
}))

app.use((req: Request, res: Response, next: NextFunction) => {
    const now = new Date().toISOString()

    console.log(`[${now}] ${req.method} ${req.url}`)

    res.locals.context = ctx

    next()
})

app.get('/api/v1/berlioz/slack-redirect-link', async (req: Request, res: Response) => {
    const { context } = res.locals

    const {
        account_id: accountId,
        slack_client_id: slackClientId,
    } = req.query

    if (!accountId || !slackClientId) {
        res.status(409).send("Missing required 'account_id' or 'client_id' query parameter(s)")

        return
    }

    const slack = new SlackAuthorization(context)

    const redirectLink = await slack.getRedirectUrl(
        parseInt(accountId as string),
        parseInt(slackClientId as string)
    )

    res.json({
        "redirect_link": redirectLink,
    })
})

app.get('/api/v1/berlioz/slack-authorization', async (req: Request, res: Response) => {
    const { context } = res.locals

    const {
        code,
        state,
    } = req.query

    if (!code || !state) {
        res.status(409).send("Missing required 'code' or 'state' query parameter(s)")

        return
    }

    const slack = new SlackAuthorization(context)

    await slack.exchangeCodeForToken(code as string, state as string)

    res.status(204).end()
})

app.post('/api/v1/berlioz/slack-event', async (req: Request, res: Response) => {
    const { context } = res.locals

    const {
        challenge,
        type
    } = req.body

    if (type == 'url_verification') {
        const slack = new SlackAuthorization(context)
        const response = slack.handleUrlVerification(challenge)

        res.json(response)

        return
    }

    const slackSignature: string = req.headers['x-slack-signature'] as string
    const slackTimestamp: string = req.headers['x-slack-request-timestamp'] as string
    const verificationString = `v0:${slackTimestamp}:${req.rawBody}`

    try {
        const slackEvent = await SlackEvent.fromVerifiedEventBody(
            context,
            slackSignature,
            verificationString,
            req.body
        )

        await slackEvent.saveEvent()
    }
    catch (error) {
        console.error(error)

        res.status(409).send('Failed to create event')

        return
    }

    res.status(204).end()
})

app.listen(port, () => {
    console.log('Server is running on port', port)
})
