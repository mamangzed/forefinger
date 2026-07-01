import { sql } from 'drizzle-orm'
import { db } from './client.js'

// Ensure schema exists on startup - idempotent DDL
const SCHEMA_DDL = `
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS visitors (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    VARCHAR(64) UNIQUE NOT NULL,
  stable_hash   VARCHAR(64) NOT NULL,
  signals       JSONB NOT NULL,
  risk_score    INTEGER NOT NULL DEFAULT 0,
  risk_level    risk_level NOT NULL DEFAULT 'low',
  flags         TEXT[] NOT NULL DEFAULT '{}',
  first_seen    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  visit_count   INTEGER NOT NULL DEFAULT 1,
  linked_accounts TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  CREATE TYPE risk_level AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE recommendation AS ENUM ('allow', 'review', 'block');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS visitor_hashes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    VARCHAR(64) NOT NULL,
  stable_hash   VARCHAR(64) NOT NULL,
  added_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source        VARCHAR(20) NOT NULL DEFAULT 'initial'
);

CREATE TABLE IF NOT EXISTS visits (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    VARCHAR(64) NOT NULL,
  ip            INET,
  country       VARCHAR(2),
  user_agent    TEXT,
  signals       JSONB,
  similarity    FLOAT,
  risk_score    INTEGER,
  risk_level    risk_level,
  flags         TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id    VARCHAR(64) NOT NULL,
  event_type    VARCHAR(50) NOT NULL,
  risk_score    INTEGER,
  risk_level    risk_level,
  recommendation recommendation,
  flags         TEXT[] NOT NULL DEFAULT '{}',
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stats_daily (
  date            DATE NOT NULL PRIMARY KEY,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  total_visits    INTEGER NOT NULL DEFAULT 0,
  bot_count       INTEGER NOT NULL DEFAULT 0,
  vpn_count       INTEGER NOT NULL DEFAULT 0,
  incognito_count INTEGER NOT NULL DEFAULT 0,
  fraud_events    INTEGER NOT NULL DEFAULT 0,
  risk_distribution JSONB
);

CREATE TABLE IF NOT EXISTS settings (
  key         VARCHAR(100) PRIMARY KEY NOT NULL,
  value       JSONB NOT NULL,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash    VARCHAR(128) UNIQUE NOT NULL,
  label       VARCHAR(100),
  active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitors_stable_hash ON visitors(stable_hash);
CREATE INDEX IF NOT EXISTS idx_visitors_risk ON visitors(risk_score);
CREATE INDEX IF NOT EXISTS idx_visitors_last_seen ON visitors(last_seen);
CREATE INDEX IF NOT EXISTS idx_visitors_flags ON visitors USING GIN(flags);
CREATE INDEX IF NOT EXISTS idx_visitors_signals ON visitors USING GIN(signals);
CREATE INDEX IF NOT EXISTS idx_visitor_hashes_hash ON visitor_hashes(stable_hash);
CREATE INDEX IF NOT EXISTS idx_visitor_hashes_visitor ON visitor_hashes(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visits_visitor ON visits(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_visits_created ON visits(created_at);
CREATE INDEX IF NOT EXISTS idx_events_visitor ON events(visitor_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, created_at);
`

export async function ensureSchema(): Promise<void> {
  // Split into statements to handle errors gracefully
  const statements = SCHEMA_DDL.split(';').map((s) => s.trim()).filter(Boolean)
  for (const stmt of statements) {
    try {
      await db.execute(sql.raw(stmt))
    } catch (err) {
      // Non-fatal: enum/table may already exist
      if (process.env.LOG_LEVEL === 'debug') {
        console.debug('[migrate] skip statement:', (err as Error).message)
      }
    }
  }
}
