'use client'

import { useEffect, useRef } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  placeholder?: string
  className?: string
  id?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Address autocomplete backed by Google Maps Places API (restricted to Chile).
 * Falls back to a plain <input> if NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not set.
 */
export function AddressAutocomplete({ value, onChange, onBlur, placeholder, className, id }: Props) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const acRef     = useRef<google.maps.places.Autocomplete | null>(null)
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    if (!apiKey) return

    let cancelled = false

    import('@googlemaps/js-api-loader').then(async ({ setOptions, importLibrary }) => {
      if (cancelled) return

      try {
        setOptions({ key: apiKey, v: 'weekly' })
        const places = await importLibrary('places') as google.maps.PlacesLibrary
        if (cancelled || !inputRef.current) return

        acRef.current = new places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'cl' },
          types: ['address'],
          fields: ['formatted_address'],
        })

        listenerRef.current = acRef.current.addListener('place_changed', () => {
          const place = acRef.current?.getPlace()
          if (place?.formatted_address) {
            onChange(place.formatted_address)
          }
        })
      } catch {/* Google Maps load failure — silently fall back to plain input */}
    }).catch(() => {})

    return () => {
      cancelled = true
      if (listenerRef.current) {
        listenerRef.current.remove()
        listenerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  )
}
