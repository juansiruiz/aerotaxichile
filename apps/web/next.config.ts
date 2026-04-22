import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aerotaxi/shared'],
  // Activar con: BUILD_STANDALONE=true pnpm build   (Linux/Docker)
  // En Windows falla por symlinks de pnpm, dejamos undefined por defecto.
  output: process.env['BUILD_STANDALONE'] === 'true' ? 'standalone' : undefined,
  experimental: {
    // Habilita React Server Components optimizaciones
  },
  // Proxy /api/* → API Hono local (puerto 4000)
  // Permite que browser y Next.js usen el mismo origen, sin CORS.
  async rewrites() {
    const apiPort = process.env['API_PORT'] ?? '4000'
    return [
      {
        source: '/api/:path*',
        destination: `http://localhost:${apiPort}/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
}

export default nextConfig
