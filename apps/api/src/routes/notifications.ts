import { Hono } from 'hono'
import { eq, and, desc } from 'drizzle-orm'
import { db } from '@aerotaxi/db'
import { notifications } from '@aerotaxi/db/schema'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const notificationsRouter = new Hono<AppEnv>()

notificationsRouter.use('*', authMiddleware)

// ─── GET /notifications — driver's notification history ───────────────────────

notificationsRouter.get('/', async (c) => {
  const user = c.get('user')

  const results = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.sub))
    .orderBy(desc(notifications.createdAt))
    .limit(60)

  return c.json({ data: results })
})

// ─── PATCH /notifications/read-all — mark all as read ────────────────────────

notificationsRouter.patch('/read-all', async (c) => {
  const user = c.get('user')

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.sub), eq(notifications.isRead, false)))

  return c.json({ ok: true })
})

// ─── PATCH /notifications/:id/read — mark single as read ─────────────────────

notificationsRouter.patch('/:id/read', async (c) => {
  const user = c.get('user')
  const id = c.req.param('id')

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, user.sub)))

  return c.json({ ok: true })
})

// ─── Exported helper — create a notification record ──────────────────────────
// Call this whenever you send a push so the driver has a persistent history.

export async function saveNotification(
  userId: string,
  data: { title: string; body?: string | null; url?: string },
): Promise<void> {
  await db
    .insert(notifications)
    .values({ userId, title: data.title, body: data.body ?? null, url: data.url ?? null })
    .catch((err: unknown) => console.error('[notify] failed to save notification', err))
}
