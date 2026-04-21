import { Hono } from 'hono'
import { writeFile, mkdir } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { randomUUID } from 'node:crypto'
import { authMiddleware, requireRole } from '../middleware/auth.js'
import type { AppEnv } from '../lib/context.js'

export const uploadsRouter = new Hono<AppEnv>()

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads')
const MAX_SIZE   = 5 * 1024 * 1024 // 5 MB
const ALLOWED    = ['image/jpeg', 'image/png', 'image/webp']

// POST /uploads/logo — sube logo de la app (admin)
uploadsRouter.post('/logo', authMiddleware, requireRole('admin'), async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || typeof file === 'string') {
    return c.json({ error: 'No se recibió ningún archivo' }, 400)
  }

  if (!ALLOWED.includes(file.type)) {
    return c.json({ error: 'Formato no soportado. Usa JPG, PNG o WebP' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'El archivo supera el límite de 5 MB' }, 400)
  }

  const ext      = extname(file.name) || '.png'
  const filename = `logo-${randomUUID()}${ext}`
  const filepath = join(UPLOAD_DIR, filename)

  await mkdir(UPLOAD_DIR, { recursive: true })

  const buffer = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(buffer))

  const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:4000'
  return c.json({ data: { url: `${baseUrl}/uploads/${filename}` } }, 201)
})

// POST /uploads/fleet-photo — sube foto de flota (admin)
uploadsRouter.post('/fleet-photo', authMiddleware, requireRole('admin'), async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || typeof file === 'string') {
    return c.json({ error: 'No se recibió ningún archivo' }, 400)
  }

  if (!ALLOWED.includes(file.type)) {
    return c.json({ error: 'Formato no soportado. Usa JPG, PNG o WebP' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'El archivo supera el límite de 5 MB' }, 400)
  }

  const ext      = extname(file.name) || '.jpg'
  const filename = `fleet-${randomUUID()}${ext}`
  const filepath = join(UPLOAD_DIR, filename)

  await mkdir(UPLOAD_DIR, { recursive: true })

  const buffer = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(buffer))

  const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:4000'
  return c.json({ data: { url: `${baseUrl}/uploads/${filename}` } }, 201)
})

// POST /uploads/photo — sube foto de perfil (admin)
uploadsRouter.post('/photo', authMiddleware, requireRole('admin'), async (c) => {
  const body = await c.req.parseBody()
  const file = body['file']

  if (!file || typeof file === 'string') {
    return c.json({ error: 'No se recibió ningún archivo' }, 400)
  }

  if (!ALLOWED.includes(file.type)) {
    return c.json({ error: 'Formato no soportado. Usa JPG, PNG o WebP' }, 400)
  }

  if (file.size > MAX_SIZE) {
    return c.json({ error: 'El archivo supera el límite de 5 MB' }, 400)
  }

  const ext      = extname(file.name) || '.jpg'
  const filename = `driver-${randomUUID()}${ext}`
  const filepath = join(UPLOAD_DIR, filename)

  // Ensure upload dir exists
  await mkdir(UPLOAD_DIR, { recursive: true })

  const buffer = await file.arrayBuffer()
  await writeFile(filepath, Buffer.from(buffer))

  const baseUrl = process.env['API_BASE_URL'] ?? 'http://localhost:4000'
  return c.json({ data: { url: `${baseUrl}/uploads/${filename}` } }, 201)
})
