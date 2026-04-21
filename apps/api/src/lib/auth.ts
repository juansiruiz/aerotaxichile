import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import type { UserRole } from '@aerotaxi/shared'

const JWT_SECRET = process.env['JWT_SECRET'] ?? 'change-me-in-production'
const JWT_EXPIRES_IN = '7d'

export interface JwtPayload {
  sub: string   // userId
  role: UserRole
  email: string
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}
