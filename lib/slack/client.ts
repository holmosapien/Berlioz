import BerliozContext from 'lib/context'

import { getSlackClientById, getSlackClientByAuthorizationState } from 'lib/database'
import { SlackClientRecord } from 'lib/records'

class SlackClient {
    context: BerliozContext
    record: SlackClientRecord

    get id(): number {
        return this.record.id
    }

    get apiClientId(): string {
        return this.record.apiClientId
    }

    get apiClientSecret(): string {
        return this.record.apiClientSecret
    }

    get signingSecret(): string {
        return this.record.signingSecret
    }

    get name(): string {
        return this.record.name
    }

    get created(): string {
        return this.record.created
    }

    constructor(context: BerliozContext, slackClientRecord: SlackClientRecord) {
        this.context = context
        this.record = slackClientRecord
    }

    static async fromSlackClientId(context: BerliozContext, slackClientId: number): Promise<SlackClient> {
        const slackClientRecord = await getSlackClientById(context, slackClientId)

        if (!slackClientRecord) {
            throw new Error('Client not found')
        }

        return new this(
            context,
            slackClientRecord,
        )
    }

    static async fromAuthorizationState(context: BerliozContext, stateId: number, accountId: number, slackClientId: number): Promise<SlackClient> {
        const slackClientRecord = await getSlackClientByAuthorizationState(context, stateId, accountId, slackClientId)

        if (!slackClientRecord) {
            throw new Error('Client not found')
        }

        return new this(
            context,
            slackClientRecord,
        )
    }
}

export default SlackClient