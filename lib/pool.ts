import fs from 'fs'
import pg from 'pg'

class BerliozDatabasePool {
    pool: pg.Pool

    constructor() {
        const config = this._generateConfig()
        const pool = new pg.Pool(config)

        this.pool = pool

        pool.on('error', (err, client) => {
            console.error('Unexpected error on idle client', err)

            process.exit(-1)
        })
    }

    async query(query: string, values?: any[]): Promise<any> {
        if (values) {
            return this.pool.query(query, values)
        } else {
            return this.pool.query(query)
        }
    }

    private _generateConfig(): pg.PoolConfig {
        const caFile = process.env.PG_CA_CERT
        const certFile = process.env.PG_CLIENT_CERT
        const keyFile = process.env.PG_CLIENT_KEY

        if (!caFile || !certFile || !keyFile) {
            return {
                ssl: {
                    rejectUnauthorized: false
                },
            }
        }

        return {
            ssl: {
                rejectUnauthorized: false,
                ca: fs.readFileSync(caFile).toString(),
                cert: fs.readFileSync(certFile).toString(),
                key: fs.readFileSync(keyFile).toString(),
            },
        }
    }
}

export default BerliozDatabasePool