import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// ─── Push Subscriptions ───────────────────────────────────────────────────────
// Stores Web Push subscriptions (endpoint + keys) per user (driver).
// One user can have multiple subscriptions (multiple devices/browsers).

export const pushSubscriptions = pgTable('push_subscriptions', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  endpoint:  text('endpoint').notNull().unique(),
  p256dh:    text('p256dh').notNull(),
  auth:      text('auth').notNull(),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
