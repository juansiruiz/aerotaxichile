import { pgTable, text, boolean, timestamp } from 'drizzle-orm/pg-core'
import { users } from './users.js'

// ─── Notifications ────────────────────────────────────────────────────────────
// In-app notification history for drivers (and potentially other roles).
// Created whenever a push notification is sent, so the driver can review
// them in the app even if the push was missed.

export const notifications = pgTable('notifications', {
  id:        text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId:    text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title:     text('title').notNull(),
  body:      text('body'),
  url:       text('url'),
  isRead:    boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
