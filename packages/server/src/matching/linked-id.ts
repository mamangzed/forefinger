import { eq } from 'drizzle-orm'
import { db, schema } from '../db/client.js'

// Attach a customer-provided linkedId (business identity) to a visitor.
// Used for: multi-accounting detection (same device → many linkedIds),
// and grouping visits under a customer-known entity (order/user/session).
export async function attachLinkedId(visitorId: string, linkedId: string): Promise<void> {
  const rows = await db
    .select({ linked: schema.visitors.linkedAccounts })
    .from(schema.visitors)
    .where(eq(schema.visitors.visitorId, visitorId))
    .limit(1)

  if (rows.length === 0) return
  const current = rows[0].linked || []
  if (current.includes(linkedId)) return

  await db
    .update(schema.visitors)
    .set({ linkedAccounts: [...current, linkedId] })
    .where(eq(schema.visitors.visitorId, visitorId))
}
