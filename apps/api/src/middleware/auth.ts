import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { verifyToken } from '../lib/auth.js'
import type { AppEnv } from '../lib/context.js'
import type { UserRole } from '@aerotaxi/shared'

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Token requerido' })
  }

  const token = authHeader.slice(7)
  try {
    const payload = verifyToken(token)
    c.set('user', payload)
    await next()
  } catch {
    throw new HTTPException(401, { message: 'Token inválido o expirado' })
  }
})

export function requireRole(...roles: UserRole[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get('user')
    if (!roles.includes(user.role)) {
      throw new HTTPException(403, { message: 'Sin permisos para esta acción' })
    }
    await next()
  })
}
