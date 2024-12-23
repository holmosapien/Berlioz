import BerliozDatabasePool from "lib/pool"

export interface BerliozContext {
    pool: BerliozDatabasePool
    listenerHostname: string
    downloadPath: string
}

export default BerliozContext