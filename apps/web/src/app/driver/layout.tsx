'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'

export default function DriverLayout({ children }: { children: ReactNode }) {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => console.log('[SW] registered', reg.scope))
        .catch((err) => console.error('[SW] registration failed', err))
    }
  }, [])

  return (
    <>
      <head>
        {/* Mobile-first viewport with safe area support */}
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
        {/* Android Chrome */}
        <meta name="mobile-web-app-capable" content="yes" />
        {/* iOS Safari */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="AeroTaxi" />
        {/* Driver-specific manifest (separate from the public landing manifest) */}
        <link rel="manifest" href="/driver-manifest.json" />
      </head>
      {children}
    </>
  )
}
