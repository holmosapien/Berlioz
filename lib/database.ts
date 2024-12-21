import BerliozContext from 'lib/context'

import {
    ChatHistoryContent,
    SlackChatRecord,
    SlackClientRecord,
    SlackEventRecord,
    SlackIntegrationRecord,
} from 'lib/records'

/*
 * Authorization queries
 *
 */

async function saveAuthorizationState(context: BerliozContext, accountId: number, slackClientId: number): Promise<number> {
    const query = `
        INSERT INTO
            slack_oauth_state
        (
            account_id,
            slack_client_id,
            created
        ) VALUES (
            $1,
            $2,
            NOW()
        )
        RETURNING
            id
    `

    const values = [
        accountId,
        slackClientId,
    ]

    const result = await context.pool.query(query, values)

    let stateId = null

    result.rows.forEach((row: any) => {
        stateId = row.id
    })

    if (!stateId) {
        throw new Error('Failed to save OAuth state')
    }

    return stateId
}

async function redeemAuthorizationState(context: BerliozContext, stateId: number): Promise<void> {
    const query = `
        UPDATE
            slack_oauth_state
        SET
            redeemed = NOW()
        WHERE
            id = $1
    `

    const values = [
        stateId,
    ]

    await context.pool.query(query, values)
}

/*
 * Client queries
 *
 */

async function getSlackClientById(context: BerliozContext, slackClientId: number): Promise<SlackClientRecord | null> {
    const query = `
        SELECT
            id,
            api_client_id,
            api_client_secret,
            name,
            created
        FROM
            slack_client
        WHERE
            id = $1
    `

    const values = [
        slackClientId,
    ]

    const result = await context.pool.query(query, values)

    let client: SlackClientRecord | null = null

    result.rows.forEach((row: any) => {
        client = {
            id: row.id,
            apiClientId: row.api_client_id,
            apiClientSecret: row.api_client_secret,
            name: row.name,
            created: row.created,
        }
    })

    return client
}

async function getSlackClientByAuthorizationState(
    context: BerliozContext,
    stateId: number,
    accountId: number,
    slackClientId: number
): Promise<SlackClientRecord | null> {
    const query = `
        SELECT
            os.id,
            os.account_id,
            c.id AS slack_client_id,
            c.api_client_id,
            c.api_client_secret,
            c.name,
            c.created
        FROM
            slack_oauth_state os
        JOIN
            slack_client c ON os.slack_client_id = c.id
        WHERE
            os.id = $1 AND
            os.account_id = $2 AND
            os.slack_client_id = $3 AND
            os.redeemed IS NULL
        ORDER BY
            os.created DESC
        LIMIT
            1
    `

    const values = [
        stateId,
        accountId,
        slackClientId,
    ]

    const cursor = await context.pool.query(query, values)

    let clientInfo: SlackClientRecord | null = null

    cursor.rows.forEach((row: any) => {
        clientInfo = {
            id: row.slack_client_id,
            apiClientId: row.api_client_id,
            apiClientSecret: row.api_client_secret,
            name: row.name,
            created: row.created,
        }
    })

    return clientInfo
}

/*
 * Integration queries
 *
 */

async function saveIntegration(
    context: BerliozContext,
    accountId: number,
    slackClientId: number,
    teamId: string,
    teamName: string,
    botUserId: string,
    appId: string,
    accessToken: string,
): Promise<SlackIntegrationRecord> {
    const query = `
        INSERT INTO
            slack_integration
        (
            account_id,
            slack_client_id,
            team_id,
            team_name,
            bot_user_id,
            app_id,
            access_token,
            created
        ) VALUES (
            $1,
            $2,
            $3,
            $4,
            $5,
            $6,
            $7,
            NOW()
        )
        RETURNING
            id,
            created
    `

    const values = [
        accountId,
        slackClientId,
        teamId,
        teamName,
        botUserId,
        appId,
        accessToken,
    ]

    const cursor = await context.pool.query(query, values)

    let integrationRecord: SlackIntegrationRecord = {
        id: 0,
        accountId,
        slackClientId,
        teamId,
        teamName,
        botUserId,
        appId,
        accessToken,
        created: '',
    }

    cursor.rows.forEach((row: any) => {
        integrationRecord.id = Number(row.id)
        integrationRecord.created = row.created
    })

    if (!integrationRecord.id) {
        throw new Error('Failed to save integration')
    }

    return integrationRecord
}

async function getIntegrationById(context: BerliozContext, slackIntegrationId: number): Promise<SlackIntegrationRecord | null> {
    const query = `
        SELECT
            id,
            account_id,
            slack_client_id,
            team_id,
            team_name,
            bot_user_id,
            app_id,
            access_token,
            created
        FROM
            slack_integration
        WHERE
            id = $1
    `

    const values = [
        slackIntegrationId,
    ]

    const cursor = await context.pool.query(query, values)

    let integration: SlackIntegrationRecord | null = null

    cursor.rows.forEach((row: any) => {
        integration = {
            id: row.id,
            accountId: row.account_id,
            slackClientId: row.slack_client_id,
            teamId: row.team_id,
            teamName: row.team_name,
            botUserId: row.bot_user_id,
            appId: row.app_id,
            accessToken: row.access_token,
            created: row.created,
        }
    })

    if (!integration) {
        return null
    }

    return integration
}

async function getIntegrationByAppId(context: BerliozContext, appId: string): Promise<SlackIntegrationRecord | null> {
    const query = `
        SELECT
            id,
            account_id,
            slack_client_id,
            team_id,
            team_name,
            bot_user_id,
            app_id,
            access_token,
            created
        FROM
            slack_integration
        WHERE
            app_id = $1
    `

    const values = [
        appId,
    ]

    const cursor = await context.pool.query(query, values)

    let integration: SlackIntegrationRecord | null = null

    cursor.rows.forEach((row: any) => {
        integration = {
            id: row.id,
            accountId: row.account_id,
            slackClientId: row.slack_client_id,
            teamId: row.team_id,
            teamName: row.team_name,
            botUserId: row.bot_user_id,
            appId: row.app_id,
            accessToken: row.access_token,
            created: row.created,
        }
    })

    if (!integration) {
        return null
    }

    return integration
}

/*
 * Event queries
 *
 */

async function saveEvent(context: BerliozContext, integrationId: number, event: any): Promise<SlackEventRecord> {
    const query = `
        INSERT INTO
            slack_event
        (
            slack_integration_id,
            event,
            created
        ) VALUES (
            $1,
            $2,
            NOW()
        )
        RETURNING
            id,
            created
    `

    const values = [
        integrationId,
        JSON.stringify(event),
    ]

    const cursor = await context.pool.query(query, values)

    let slackEventRecord: SlackEventRecord = {
        id: 0,
        slackIntegrationId: integrationId,
        event,
        created: '',
        processed: null,
    }

    cursor.rows.forEach((row: any) => {
        slackEventRecord.id = row.id
        slackEventRecord.created = row.created
    })

    if (!slackEventRecord.id) {
        throw new Error('Failed to save event')
    }

    return slackEventRecord
}

async function getNextUnprocessedEvent(context: BerliozContext): Promise<SlackEventRecord | null> {
    const query = `
        SELECT
            id,
            slack_integration_id,
            event,
            created,
            processed
        FROM
            slack_event
        WHERE
            processed IS NULL
        ORDER BY
            created ASC
        LIMIT
            1
    `

    const cursor = await context.pool.query(query)

    let event: SlackEventRecord | null = null

    cursor.rows.forEach((row: any) => {
        event = {
            id: row.id,
            slackIntegrationId: row.slack_integration_id,
            event: row.event,
            created: row.created,
            processed: row.processed,
        }
    })

    return event
}

async function markEventAsProcessed(context: BerliozContext, slackEventId: number) {
    const query = `
        UPDATE
            slack_event
        SET
            processed = NOW()
        WHERE
            id = $1
    `

    const values = [
        slackEventId,
    ]

    await context.pool.query(query, values)
}

async function saveSlackChat(context: BerliozContext, integrationId: number, channelId: string, timestamp: string): Promise<SlackChatRecord> {
    const query = `
        INSERT INTO
            slack_chat
        (
            slack_integration_id,
            channel_id,
            thread_ts,
            created
        ) VALUES (
            $1,
            $2,
            $3,
            NOW()
        )
        RETURNING
            id,
            created
    `

    const values = [
        integrationId,
        channelId,
        timestamp,
    ]

    const cursor = await context.pool.query(query, values)

    let chat: SlackChatRecord = {
        id: 0,
        slackIntegrationId: integrationId,
        channelId,
        timestamp,
        rounds: [],
        created: '',
    }

    cursor.rows.forEach((row: any) => {
        chat.id = row.id
        chat.created = row.created
    })

    if (!chat.id) {
        throw new Error('Failed to save chat')
    }

    return chat
}

async function getSlackChat(context: BerliozContext, slackIntegrationId: number, channelId: string, timestamp: string): Promise<SlackChatRecord> {
    const query = `
        SELECT
            sc.id,
            sc.slack_integration_id,
            sc.channel_id,
            sc.thread_ts,
            scr.id AS round_id,
            scr.round,
            sc.created
        FROM
            slack_chat sc
        LEFT JOIN
            slack_chat_round scr ON sc.id = scr.slack_chat_id
        WHERE
            sc.slack_integration_id = $1 AND
            sc.channel_id = $2 AND
            sc.thread_ts = $3
        ORDER BY
            sc.id,
            scr.id
    `

    const values = [
        slackIntegrationId,
        channelId,
        timestamp,
    ]

    const cursor = await context.pool.query(query, values)

    let chat: SlackChatRecord = {
        id: 0,
        slackIntegrationId,
        channelId,
        timestamp,
        rounds: [],
        created: new Date().toISOString(),
    }

    cursor.rows.forEach((row: any) => {
        chat.id = row.id
        chat.created = row.created

        if (row.round_id) {
            chat.rounds.push({
                id: row.round_id,
                slackChatId: row.id,
                round: row.round,
                created: row.created,
            })
        }
    })

    return chat
}

async function saveSlackChatRound(context: BerliozContext, slackChatId: number, round: ChatHistoryContent): Promise<void> {
    const query = `
        INSERT INTO
            slack_chat_round
        (
            slack_chat_id,
            round,
            created
        ) VALUES (
            $1,
            $2,
            NOW()
        )
    `

    const values = [
        slackChatId,
        JSON.stringify(round),
    ]

    await context.pool.query(query, values)
}

export {
    saveAuthorizationState,
    redeemAuthorizationState,
    getSlackClientById,
    getSlackClientByAuthorizationState,
    saveIntegration,
    getIntegrationById,
    getIntegrationByAppId,
    saveEvent,
    getNextUnprocessedEvent,
    markEventAsProcessed,
    saveSlackChat,
    getSlackChat,
    saveSlackChatRound,
}