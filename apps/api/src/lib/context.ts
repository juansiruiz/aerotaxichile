import type { JwtPayload } from './auth.js'

export type AppEnv = {
  Variables: {
    user: JwtPayload
  }
}
