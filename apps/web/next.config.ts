import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@aerotaxi/shared'],
  // Activar con: BUILD_STANDALONE=true pnpm build   (Linux/Docker)
  // En Windows falla por symlinks de pnpm, dejamos undefined por defecto.
  output: process.env['BUILD_STANDALONE'] === 'true' ? 'standalone' : undefined,
  experimental: {
    // Habilita React Server Components optimizaciones
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
