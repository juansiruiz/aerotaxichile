import type { Zone } from '../types/index.js'

/**
 * Normaliza texto: minúsculas + elimina tildes
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Detecta la zona a partir de un texto de dirección.
 * Busca nombres de comunas dentro del string de dirección.
 * Prioriza comunas más largas para evitar falsos positivos.
 */
export function detectZoneFromAddress(address: string, zones: Zone[]): Zone | null {
  if (!address || address.length < 3 || zones.length === 0) return null

  const normalizedAddr = normalize(address)

  // Construir lista plana: { zona, comuna, normalized } ordenada por longitud desc
  // (más largo primero para evitar que "la" matchee antes que "la florida")
  const entries: { zone: Zone; comunaNorm: string }[] = []
  for (const zone of zones) {
    for (const comuna of zone.comunas ?? []) {
      entries.push({ zone, comunaNorm: normalize(comuna) })
    }
  }
  entries.sort((a, b) => b.comunaNorm.length - a.comunaNorm.length)

  for (const { zone, comunaNorm } of entries) {
    // Buscamos la comuna como palabra/frase completa (con límites de palabra)
    if (normalizedAddr.includes(comunaNorm)) {
      return zone
    }
  }

  return null
}

/**
 * Mapa estático de comunas por zona (usado como fallback si la BD aún no tiene datos).
 * Cubre la Región Metropolitana de Santiago.
 */
export const COMUNAS_POR_ZONA: Record<string, string[]> = {
  central: [
    'Santiago', 'Providencia', 'Ñuñoa', 'San Miguel',
    'Estación Central', 'Pedro Aguirre Cerda',
  ],
  norte: [
    'Recoleta', 'Independencia', 'Conchalí', 'Huechuraba',
    'Quilicura', 'Renca',
  ],
  sur: [
    'El Bosque', 'La Cisterna', 'Lo Espejo', 'Maipú',
    'San Joaquín', 'Cerrillos', 'San Bernardo', 'Lo Prado',
    'Pudahuel',
  ],
  nororiente: [
    'Vitacura', 'Las Condes', 'Lo Barnechea', 'La Reina',
  ],
  suroriente: [
    'La Florida', 'Peñalolén', 'Macul', 'La Granja',
    'La Pintana', 'San Ramón',
  ],
  poniente: [
    'Cerro Navia', 'Quinta Normal', 'Pudahuel',
    'Bustos', 'Noviciado',
  ],
  rural: [
    'Colina', 'Lampa', 'Til Til', 'Calera de Tango',
    'Talagante', 'Peñaflor', 'El Monte', 'Isla de Maipo',
    'Padre Hurtado', 'Paine', 'Buin', 'San José de Maipo',
    'Pirque', 'Curacaví', 'Melipilla', 'María Pinto',
    'Alhué', 'San Pedro',
  ],
}
