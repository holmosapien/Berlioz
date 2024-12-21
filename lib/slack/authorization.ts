import BerliozContext from 'lib/context'
import SlackClient from 'lib/slack/client'
import SlackIntegration from 'lib/slack/integration'

import {
    saveAuthorizationState,
    redeemAuthorizationState,
} from 'lib/database'

import {
    SlackIntegrationRecord,
} from 'lib/records'

class SlackAuthorization {
    context: BerliozContext

    constructor(context: BerliozContext) {
        this.context = context
    }

    handleUrlVerification(challenge: string): Object {
        return {
            challenge,
        }
    }

    async getRedirectUrl(accountId: number, slackClientId: number): Promise<string> {
        const stateId = await saveAuthorizationState(this.context, accountId, slackClientId)

        const state = JSON.stringify({
            state_id: stateId,
            account_id: accountId,
            slack_client_id: slackClientId,
        })

        const botScopes = [
            'app_mentions:read',
            'chat:write',
        ].join(',')

        const slackClient = await SlackClient.fromSlackClientId(this.context, slackClientId)

        const params = new URLSearchParams()

        params.append("client_id", slackClient.apiClientId)
        params.append("scope", botScopes)
        params.append("user_scope", '')
        params.append("redirect_uri", 'https://slack.holmosapien.com/api/v1/berlioz/slack-authorization')
        params.append("state", state)

        const url = 'https://slack.com/oauth/v2/authorize?' + params.toString()

        return url
    }

    async exchangeCodeForToken(code: string, state: string): Promise<string> {

        /*
         * Decode the state to find out which account and client we're dealing with.
         *
         * The state is base64 encoded JSON that looks like this:
         *
         * {
         *     "state_id": 1,
         *     "account_id": 1,
         *     "client_id": 1
         * }
         *
         */

        const stateObj = await JSON.parse(state)

        const {
            state_id: stateId,
            account_id: accountId,
            slack_client_id: slackClientId,
        } = stateObj

        const clientInfo = await SlackClient.fromAuthorizationState(this.context, stateId, accountId, slackClientId)

        if (!clientInfo) {
            throw new Error(`Could not find client associated with state ID ${stateId}`)
        }

        const token = await this.getSlackToken(accountId, clientInfo, code)

        await redeemAuthorizationState(this.context, stateId)

        return token
    }

    async getSlackToken(accountId: number, slackClient: SlackClient, code: string): Promise<string> {
        const params = new URLSearchParams()

        params.append("client_id", slackClient.apiClientId)
        params.append("client_secret", slackClient.apiClientSecret)
        params.append("code", code)

        const url = 'https://slack.com/api/oauth.v2.access?' + params.toString()

        const response = await fetch(url, {
            method: 'POST',
        })

        const payload = await response.json()

        const {
            access_token: accessToken,
            bot_user_id: botUserId,
            app_id: appId,
            team: {
                id: teamId,
                name: teamName,
            }
        } = payload

        const integrationRecord: SlackIntegrationRecord = {
            id: 0,
            accountId,
            slackClientId: slackClient.id,
            teamId,
            teamName,
            botUserId,
            accessToken,
            appId,
            created: new Date().toISOString(),
        }

        const integration = new SlackIntegration(this.context, integrationRecord)

        integration.createIntegration()

        return accessToken
    }
}

export default SlackAuthorization