import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema.js'

const databaseUrl = process.env.DATABASE_URL || 'postgres://fp:fp@localhost:5432/fingerprint'

// Connection pool
const client = postgres(databaseUrl, {
  max: 20,
  idle_timeout: 30,
  connect_timeout: 10,
  prepare: false
})

export const db = drizzle(client, { schema, logger: process.env.LOG_LEVEL === 'debug' })
export { schema }
export type DB = typeof db
