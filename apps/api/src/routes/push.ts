import { Hono } from 'hono'
import webpush from 'web-push'
import { db } from '@aerotaxi/db'
import { pushSubscriptions } from '@aerotaxi/db/schema'
import { eq } from 'drizzle-orm'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

// ─── VAPID setup ──────────────────────────────────────────────────────────────

export function initVapid() {
  const subject = process.env['VAPID_SUBJECT']
  const publicKey = process.env['VAPID_PUBLIC_KEY']
  const privateKey = process.env['VAPID_PRIVATE_KEY']

  if (subject && publicKey && privateKey) {
    webpush.setVapidDetails(subject, publicKey, privateKey)
  } else {
    console.warn('[push] VAPID keys not configured — push notifications disabled')
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

export async function sendPushToUser(userId: string, payload: object) {
  const subs = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId))

  if (subs.length === 0) return

  const payloadStr = JSON.stringify(payload)

  await Promise.allSettled(
    subs.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payloadStr,
        )
        .catch(async (err: any) => {
          // Remove expired/invalid subscriptions (410 Gone or 404)
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await db
              .delete(pushSubscriptions)
              .where(eq(pushSubscriptions.endpoint, sub.endpoint))
          }
        }),
    ),
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const pushRouter = new Hono<AppEnv>()

// GET /push/vapid-key — public, no auth required
pushRouter.get('/vapid-key', (c) =>
  c.json({ data: process.env['VAPID_PUBLIC_KEY'] ?? null }),
)

// POST /push/subscribe — authenticated user (driver) registers a push subscription
pushRouter.post('/subscribe', authMiddleware, async (c) => {
  const user = c.get('user')
  const body = await c.req.json<{ endpoint: string; keys: { p256dh: string; auth: string } }>()

  if (!body.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return c.json({ error: 'Datos de suscripción incompletos' }, 400)
  }

  await db
    .insert(pushSubscriptions)
    .values({
      userId:    user.sub,
      endpoint:  body.endpoint,
      p256dh:    body.keys.p256dh,
      auth:      body.keys.auth,
      userAgent: c.req.header('user-agent') ?? null,
    })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: {
        p256dh:    body.keys.p256dh,
        auth:      body.keys.auth,
        userAgent: c.req.header('user-agent') ?? null,
      },
    })

  return c.json({ ok: true })
})

// DELETE /push/subscribe — unsubscribe this endpoint
pushRouter.delete('/subscribe', authMiddleware, async (c) => {
  const body = await c.req.json<{ endpoint: string }>()
  if (!body.endpoint) return c.json({ error: 'endpoint requerido' }, 400)

  await db
    .delete(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, body.endpoint))

  return c.json({ ok: true })
})
