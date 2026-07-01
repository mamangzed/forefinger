import { sql } from 'drizzle-orm'
import { db } from './client.js'

// Idempotent schema statements, run individually. Plain CREATE TYPE (no
// DO/plpgsql block) — if the type exists the error is caught and we continue.
const STATEMENTS: string[] = [
  `CREATE EXTENSION IF NOT EXISTS "pgcrypto"`,

  // Enums — plain CREATE; duplicate_object error is expected & swallowed
  `CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high')`,
  `CREATE TYPE recommendation AS ENUM ('allow', 'review', 'block')`,

  `CREATE TABLE IF NOT EXISTS visitors (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id    VARCHAR(64) UNIQUE NOT NULL,
     stable_hash   VARCHAR(64) NOT NULL,
     device_hash   VARCHAR(48),
     signals       JSONB NOT NULL,
     risk_score    INTEGER NOT NULL DEFAULT 0,
     risk_level    risk_level NOT NULL DEFAULT 'low',
     flags         TEXT[] NOT NULL DEFAULT '{}',
     first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     visit_count   INTEGER NOT NULL DEFAULT 1,
     linked_accounts TEXT[] NOT NULL DEFAULT '{}',
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `ALTER TABLE visitors ADD COLUMN IF NOT EXISTS device_hash VARCHAR(48)`,

  `CREATE TABLE IF NOT EXISTS device_hashes (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id    VARCHAR(64) NOT NULL,
     device_hash   VARCHAR(48) NOT NULL,
     added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE UNIQUE INDEX IF NOT EXISTS idx_device_hashes_uniq ON device_hashes(visitor_id, device_hash)`,

  `CREATE TABLE IF NOT EXISTS visitor_hashes (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id    VARCHAR(64) NOT NULL,
     stable_hash   VARCHAR(64) NOT NULL,
     added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
     source        VARCHAR(20) NOT NULL DEFAULT 'initial'
   )`,

  `CREATE TABLE IF NOT EXISTS visits (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id    VARCHAR(64) NOT NULL,
     ip            INET,
     country       VARCHAR(2),
     country_name  VARCHAR(64),
     city          VARCHAR(64),
     latitude      FLOAT,
     longitude     FLOAT,
     user_agent    TEXT,
     signals       JSONB,
     similarity    FLOAT,
     risk_score    INTEGER,
     risk_level    risk_level,
     flags         TEXT[] NOT NULL DEFAULT '{}',
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `ALTER TABLE visits ADD COLUMN IF NOT EXISTS country_name VARCHAR(64)`,
  `ALTER TABLE visits ADD COLUMN IF NOT EXISTS city VARCHAR(64)`,
  `ALTER TABLE visits ADD COLUMN IF NOT EXISTS latitude FLOAT`,
  `ALTER TABLE visits ADD COLUMN IF NOT EXISTS longitude FLOAT`,

  `CREATE TABLE IF NOT EXISTS events (
     id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     visitor_id    VARCHAR(64) NOT NULL,
     event_type    VARCHAR(50) NOT NULL,
     risk_score    INTEGER,
     risk_level    risk_level,
     recommendation recommendation,
     flags         TEXT[] NOT NULL DEFAULT '{}',
     metadata      JSONB,
     created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS stats_daily (
     date            DATE NOT NULL PRIMARY KEY,
     unique_visitors INTEGER NOT NULL DEFAULT 0,
     total_visits    INTEGER NOT NULL DEFAULT 0,
     bot_count       INTEGER NOT NULL DEFAULT 0,
     vpn_count       INTEGER NOT NULL DEFAULT 0,
     incognito_count INTEGER NOT NULL DEFAULT 0,
     fraud_events    INTEGER NOT NULL DEFAULT 0,
     risk_distribution JSONB
   )`,

  `CREATE TABLE IF NOT EXISTS settings (
     key         VARCHAR(100) PRIMARY KEY NOT NULL,
     value       JSONB NOT NULL,
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE TABLE IF NOT EXISTS api_keys (
     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     key_hash    VARCHAR(128) UNIQUE NOT NULL,
     label       VARCHAR(100),
     active      BOOLEAN NOT NULL DEFAULT TRUE,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
   )`,

  `CREATE INDEX IF NOT EXISTS idx_visitors_stable_hash ON visitors(stable_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_visitors_device_hash ON visitors(device_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_visitors_risk ON visitors(risk_score)`,
  `CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen)`,
  `CREATE INDEX IF NOT EXISTS idx_visitors_flags ON visitors USING GIN(flags)`,
  `CREATE INDEX IF NOT EXISTS idx_visitors_signals ON visitors USING GIN(signals)`,
  `CREATE INDEX IF NOT EXISTS idx_visitor_hashes_hash ON visitor_hashes(stable_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_visitor_hashes_visitor ON visitor_hashes(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_visits_country ON visits(country)`,
  `CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, created_at)`
]

// Error codes that are safe to ignore (object/type already exists)
const SAFE_CODES = new Set(['42710', '42P06', '42P07'])

export async function ensureSchema(): Promise<void> {
  let errors = 0
  for (const stmt of STATEMENTS) {
    try {
      await db.execute(sql.raw(stmt))
    } catch (err) {
      const e = err as { code?: string; message?: string }
      const safe = e.code ? SAFE_CODES.has(e.code) : false
      // Always log non-safe errors so schema problems are visible.
      if (!safe) {
        errors++
        console.error(`[migrate] failed: ${stmt.slice(0, 80).replace(/\n/g, ' ')}... → ${e.code || ''} ${e.message}`)
      }
    }
  }
  if (errors > 0) {
    console.error(`[migrate] ${errors} statement(s) failed — tables may be missing`)
  }
}
