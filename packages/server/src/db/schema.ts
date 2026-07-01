import {
  pgTable,
  uuid,
  varchar,
  jsonb,
  integer,
  text,
  timestamp,
  real,
  date,
  boolean,
  index,
  uniqueIndex,
  inet,
  pgEnum
} from 'drizzle-orm/pg-core'

export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high'])
export const recommendationEnum = pgEnum('recommendation', ['allow', 'review', 'block'])

export const visitors = pgTable(
  'visitors',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull().unique(),
    stableHash: varchar('stable_hash', { length: 64 }).notNull(),
    deviceHash: varchar('device_hash', { length: 48 }),
    canvasHash: varchar('canvas_hash', { length: 64 }),
    signals: jsonb('signals').notNull(),
    riskScore: integer('risk_score').default(0).notNull(),
    riskLevel: riskLevelEnum('risk_level').default('low').notNull(),
    flags: text('flags').array().default([]).notNull(),
    firstSeen: timestamp('first_seen', { withTimezone: true }).defaultNow().notNull(),
    lastSeen: timestamp('last_seen', { withTimezone: true }).defaultNow().notNull(),
    visitCount: integer('visit_count').default(1).notNull(),
    linkedAccounts: text('linked_accounts').array().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    stableHashIdx: index('idx_visitors_stable_hash').on(t.stableHash),
    deviceHashIdx: index('idx_visitors_device_hash').on(t.deviceHash),
    canvasHashIdx: index('idx_visitors_canvas_hash').on(t.canvasHash),
    riskIdx: index('idx_visitors_risk').on(t.riskScore),
    lastSeenIdx: index('idx_visitors_last_seen').on(t.lastSeen),
    flagsIdx: index('idx_visitors_flags').on(t.flags),
    signalsIdx: index('idx_visitors_signals').on(t.signals)
  })
)

export const visitorHashes = pgTable(
  'visitor_hashes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    stableHash: varchar('stable_hash', { length: 64 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull(),
    source: varchar('source', { length: 20 }).default('initial').notNull()
  },
  (t) => ({
    hashIdx: index('idx_visitor_hashes_hash').on(t.stableHash),
    visitorIdx: index('idx_visitor_hashes_visitor').on(t.visitorId),
    uniq: uniqueIndex('idx_visitor_hashes_uniq').on(t.visitorId, t.stableHash)
  })
)

export const visits = pgTable(
  'visits',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    ip: inet('ip'),
    country: varchar('country', { length: 2 }),
    countryName: varchar('country_name', { length: 64 }),
    city: varchar('city', { length: 64 }),
    latitude: real('latitude'),
    longitude: real('longitude'),
    userAgent: text('user_agent'),
    signals: jsonb('signals'),
    similarity: real('similarity'),
    riskScore: integer('risk_score'),
    riskLevel: riskLevelEnum('risk_level'),
    flags: text('flags').array().default([]).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    visitorIdx: index('idx_visits_visitor').on(t.visitorId, t.createdAt),
    createdIdx: index('idx_visits_created').on(t.createdAt),
    countryIdx: index('idx_visits_country').on(t.country)
  })
)

// Cross-browser device hashes — maps a normalized device fingerprint to a
// visitor so the same physical device is recognized across Chrome/Firefox/Edge.
export const deviceHashes = pgTable(
  'device_hashes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    deviceHash: varchar('device_hash', { length: 48 }).notNull(),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    hashIdx: index('idx_device_hashes_hash').on(t.deviceHash),
    visitorIdx: index('idx_device_hashes_visitor').on(t.visitorId),
    uniq: uniqueIndex('idx_device_hashes_uniq').on(t.visitorId, t.deviceHash)
  })
)

// Canvas hashes — links incognito sessions of the SAME browser on the same
// device. Canvas output is stable across private-mode windows (depends on GPU/
// driver/font rendering, not on browsing state), so identical canvas hash +
// matching audio/WebGL strongly implies the same browser install.
export const canvasHashes = pgTable(
  'canvas_hashes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    canvasHash: varchar('canvas_hash', { length: 64 }).notNull(),
    audioHash: varchar('audio_hash', { length: 64 }),
    addedAt: timestamp('added_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    hashIdx: index('idx_canvas_hashes_hash').on(t.canvasHash),
    visitorIdx: index('idx_canvas_hashes_visitor').on(t.visitorId),
    uniq: uniqueIndex('idx_canvas_hashes_uniq').on(t.visitorId, t.canvasHash)
  })
)

export const events = pgTable(
  'events',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    visitorId: varchar('visitor_id', { length: 64 }).notNull(),
    eventType: varchar('event_type', { length: 50 }).notNull(),
    riskScore: integer('risk_score'),
    riskLevel: riskLevelEnum('risk_level'),
    recommendation: recommendationEnum('recommendation'),
    flags: text('flags').array().default([]).notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  },
  (t) => ({
    visitorIdx: index('idx_events_visitor').on(t.visitorId, t.createdAt),
    typeIdx: index('idx_events_type').on(t.eventType, t.createdAt)
  })
)

export const statsDaily = pgTable(
  'stats_daily',
  {
    date: date('date').notNull().primaryKey(),
    uniqueVisitors: integer('unique_visitors').default(0).notNull(),
    totalVisits: integer('total_visits').default(0).notNull(),
    botCount: integer('bot_count').default(0).notNull(),
    vpnCount: integer('vpn_count').default(0).notNull(),
    incognitoCount: integer('incognito_count').default(0).notNull(),
    fraudEvents: integer('fraud_events').default(0).notNull(),
    riskDistribution: jsonb('risk_distribution')
  }
)

export const settings = pgTable('settings', {
  key: varchar('key', { length: 100 }).notNull().primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull()
})

export const apiKeys = pgTable(
  'api_keys',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    keyHash: varchar('key_hash', { length: 128 }).notNull().unique(),
    label: varchar('label', { length: 100 }),
    active: boolean('active').default(true).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull()
  }
)

export type Visitor = typeof visitors.$inferSelect
export type Visit = typeof visits.$inferSelect
export type Event = typeof events.$inferSelect
export type StatsDaily = typeof statsDaily.$inferSelect
