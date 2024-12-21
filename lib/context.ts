import BerliozDatabasePool from "lib/pool"

export interface BerliozContext {
    pool: BerliozDatabasePool
}

export default BerliozContext