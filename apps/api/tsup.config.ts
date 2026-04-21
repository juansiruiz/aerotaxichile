import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],          // ESM — coincide con "type":"module" del package.json
  target: 'node20',
  bundle: true,             // empaqueta todo en un solo archivo
  splitting: false,
  sourcemap: false,
  clean: true,
  // Dependencias nativas que no se pueden empaquetar
  external: [
    'firebase-admin',
    'pg-native',
    '@mapbox/node-pre-gyp',
  ],
  // Variables de entorno se leen en runtime desde el .env del servidor
  define: {
    'process.env.NODE_ENV': '"production"',
  },
})
