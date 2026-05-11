# Estructura Web Completa de AeroTaxi Chile — Para Migración a Laravel

> Este documento describe con exhaustividad TODA la estructura, funcionalidades, componentes,
> flujos de navegación y detalles visuales del frontend de AeroTaxi Chile.
> Úsalo como referencia completa para implementar la interfaz web en Laravel.

---

## TABLA DE CONTENIDOS

1. [Estructura General del Proyecto](#estructura-general)
2. [Paleta de Colores y Tipografía](#paleta-y-tipografia)
3. [Landing Page (`/`)](#landing-page)
4. [Autenticación (Login/Register)](#autenticacion)
5. [Wizard de Reserva (`/booking`)](#wizard-reserva)
6. [Dashboard del Cliente (`/dashboard`)](#dashboard-cliente)
7. [Mis Reservas (`/mis-reservas`)](#mis-reservas)
8. [Mis Direcciones (`/mis-direcciones`)](#mis-direcciones)
9. [Mi Perfil (`/profile`)](#mi-perfil)
10. [Panel Admin (`/admin`)](#panel-admin)
11. [Roles y Control de Acceso](#roles-acceso)
12. [Componentes Reutilizables](#componentes)
13. [Navegación y Flujos Completos](#flujos)
14. [Responsive Design](#responsive)

---

## ESTRUCTURA GENERAL

### Routing y URLs

```
/                        → Landing Page (pública)
/auth/login              → Página de login
/auth/register           → Página de registro (si existe como página separada)
/booking                 → Wizard de reserva (3 pasos)
/dashboard               → Dashboard principal del cliente
/mis-reservas            → Historial y gestión de reservas
/mis-direcciones         → Gestor de direcciones guardadas
/profile                 → Perfil del usuario
/driver                  → Panel del conductor (rol: driver)
/admin                   → Admin principal (rol: admin)
/admin/zonas             → Gestor de zonas y tarifas
/admin/viajes            → Gestor de reservas (admin view)
/admin/clientes          → Lista de clientes
/admin/conductores       → Lista de conductores
/admin/usuarios          → Gestor de usuarios
/admin/configuracion     → Configuración de la app
/admin/contenido         → Gestor de contenido (landing page)
```

### Estructura de carpetas

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                # Layout root (fonts, viewport, metadata)
│   │   ├── page.tsx                  # Landing page
│   │   ├── globals.css               # Estilos globales (Tailwind)
│   │   ├── auth/
│   │   │   ├── login/page.tsx
│   │   │   └── register/page.tsx
│   │   ├── booking/page.tsx          # Wizard de reserva
│   │   ├── dashboard/page.tsx        # Dashboard cliente
│   │   ├── mis-reservas/page.tsx
│   │   ├── mis-direcciones/page.tsx
│   │   ├── profile/page.tsx
│   │   ├── driver/
│   │   │   ├── layout.tsx            # Layout para driver
│   │   │   └── page.tsx              # Panel del conductor
│   │   └── admin/
│   │       ├── layout.tsx            # Layout para admin (sidebar)
│   │       ├── page.tsx              # Admin dashboard
│   │       ├── zonas/page.tsx
│   │       ├── viajes/page.tsx
│   │       ├── clientes/page.tsx
│   │       ├── conductores/page.tsx
│   │       ├── usuarios/page.tsx
│   │       ├── configuracion/page.tsx
│   │       ├── contenido/page.tsx
│   │       ├── AssignDriverModal.tsx
│   │       ├── BookingDetailModal.tsx
│   │       └── AdminNewBookingModal.tsx
│   ├── components/
│   │   ├── Navbar.tsx                # Barra de navegación global
│   │   ├── HeroBookingWidget.tsx     # Widget de reserva en hero
│   │   ├── AddressAutocomplete.tsx   # Autocompletado de Google Places
│   │   └── AdminSidebar.tsx          # Sidebar del admin
│   ├── store/
│   │   └── auth.ts                   # Zustand store (autenticación global)
│   └── lib/
│       ├── api.ts                    # Cliente API (fetch wrapper)
│       └── site-content.ts           # Funciones de contenido del sitio
├── public/
│   ├── manifest.json                 # PWA manifest
│   ├── driver-manifest.json          # PWA manifest específico para driver
│   ├── sw.js                         # Service Worker
│   └── icon-*.png                    # Iconos para PWA
├── tailwind.config.ts                # Configuración de Tailwind
├── tsconfig.json
└── package.json
```

---

## PALETA DE COLORES Y TIPOGRAFÍA {#paleta-y-tipografia}

### Colores principales

| Nombre          | Valor hex | Uso                                |
|-----------------|-----------|-------------------------------------|
| `brand-500`     | #f97316   | Color primario (naranja), botones, accents |
| `brand-600`     | #ea580c   | Hover estado de brand               |
| `slate-900`     | #0f172a   | Texto oscuro, backgrounds oscuros  |
| `slate-50`      | #f8fafc   | Backgrounds claros                 |
| `white`         | #ffffff   | Blanco puro                        |

### Colores secundarios (status, alertas)

| Uso               | Color         | Hex       |
|-------------------|---------------|-----------|
| Success/Verde     | emerald-500   | #10b981   |
| Error/Rojo        | red-500       | #ef4444   |
| Warning/Amber     | amber-500     | #f59e0b   |
| Info/Azul         | blue-500      | #3b82f6   |
| Slate/Gris        | slate-500     | #64748b   |

### Tipografía

| Elemento          | Font Family   | Weight | Tamaño            |
|-------------------|---------------|--------|-------------------|
| Headings (h1-h3) | Manrope       | 700/800| 2.5rem - 3.75rem  |
| Body text         | Inter         | 400    | 0.875rem - 1rem   |
| Labels/Small      | Inter         | 500    | 0.75rem - 0.875rem |
| Monospace (si)    | Sistema       | 400    | 0.875rem          |

**Fuentes importadas:**
- `Manrope` (weights: 400, 700, 800) para headings y títulos
- `Inter` (weights: 400, 500, 600) para body y labels
- `Material Symbols Outlined` para iconos (Google's icon library)

---

## LANDING PAGE (`/`) {#landing-page}

### Estructura visual (de arriba a abajo)

#### 1. **Navbar** (sticky, z-50)
- Logo + nombre "Aerotaxi **Chile**" (chile en naranja)
- Enlaces desktop: "Servicios" | "Tarifas" | "Contacto"
- Sección derecha (según auth):
  - **No autenticado**: Botón "Entrar" (outline) → `/auth/login`
  - **Autenticado**: Avatar circular con iniciales + nombre + dropdown con opciones
- Menú mobile (hamburger): Links + logout si está autenticado
- Efecto de scroll: fondo blanco opaco con backdrop blur, shadow al hacer scroll

#### 2. **Hero Section** (100vh - 92vh, fondo oscuro)

**Fondo:**
- Degradado oscuro: `from-slate-900 via-slate-800 to-slate-900`
- Overlay con radiales naranja (20% opacidad)
- Líneas decorativas (gradientes transparentes)

**Contenido (2 columnas en lg, stack en mobile):**

**Columna izquierda:**
- Badge pequeño: ⭐ + texto (configurable desde admin)
  - Fondo: `brand-500/10`, border: `brand-500/30`, texto: `brand-400`
- Título: "**Traslados seguros, puntuales y confortables**"
  - Tamaño: 3.75rem (lg), 2.5rem (mobile)
  - Color blanco con una palabra clave en naranja (`brand-500`)
- Subtítulo: texto descriptivo en `slate-300`
- 3 items de confianza (checkmarks + texto):
  - Ej: "✓ Conductores certificados" | "✓ Precio fijo" | "✓ 24/7"

**Columna derecha:**
- Widget de reserva rápida (ver sección HeroBookingWidget más abajo)

#### 3. **Stats Section** (fondo blanco)

Grid de 4 columnas (2 cols en mobile, divide lines):
- Ícono grande (naranja)
- Número grande (slate-900)
- Texto pequeño (slate-500)

Ejemplo: `🚗 500+ | Traslados mensuales`

Datos cargados desde `/settings` de la API.

#### 4. **Cómo Funciona** (id="servicios", fondo slate-50)

Subtítulo badge: "PROCESO" (uppercase, naranja, tracked)
Título: "Reserva en 3 simple pasos"

Grid 3 columnas con cards:
1. 📅 "Elige la fecha y hora"
2. ✓ "Confirma tu viaje"
3. 📍 "Espera al conductor"

Cada card:
- Número grande `01` / `02` / `03` en `brand-100`
- Ícono + título + descripción
- Línea conectora entre cards (desktop)
- Hover: shadow aumenta

#### 5. **Tarifas** (id="tarifas")

Título: "Nuestras tarifas por zona"
Grid 2-3 columnas con 7 zonas (hardcoded o configurable):
- Zona Central: $15.000
- Zona Sur: $18.000
- Zona Norte: $18.000
- Zona Nororiente: $20.000
- Zona Suroriente: $20.000
- Zona Poniente: $22.000
- Zona Rural: $28.000

Cada zona es una card con color/degradado diferente.

#### 6. **Flota** (Vehículos)

Título: "Nuestra flota de vehículos"
Grid 2-4 columnas con 4 vehículos:
- Sedan VIP (hasta 4 pax)
- SUV (hasta 5 pax)
- Minivan (hasta 7 pax)
- Van (hasta 12 pax)

Cada card con:
- Degradado único (colores pastel)
- Ícono de vehículo
- Nombre + capacidad
- Descripción

#### 7. **Por qué nosotros** (Features)

Grid de 6 características (3 cols en lg, 2 en mobile):
- Ícono + título + descripción
- Colores variados (blue, green, purple, orange, etc.)

Ejemplos:
- "Conductores profesionales"
- "Precios fijos"
- "Disponible 24/7"
- "Reserva instantánea"
- "Seguimiento en vivo"
- "Satisfacción garantizada"

#### 8. **Call-to-action**

Botón grande: "Reservar ahora" → `/booking`
Subtexto: "Sin cargos ocultos. Precio fijo garantizado."

#### 9. **Footer**

Links útiles, redes sociales (Instagram, Facebook, WhatsApp)
Copyright

### HeroBookingWidget — Widget en Hero

**Ubicación:** Columna derecha del hero section.

**Funcionalidad:** Mini formulario de búsqueda rápida de disponibilidad.

**Campos:**
- **Dirección de recogida** (autocomplete Google Places)
- **Dirección de destino** (autocomplete, o selector si modo zona)
- **Fecha** (date picker)
- **Hora** (time picker)
- **Pasajeros** (number 1-12)
- Botón "Reservar": navega a `/booking?direction=...&date=...&time=...`

**Estilos:**
- Fondo blanco, rounded-2xl, shadow
- Layout vertical (stack)
- Inputs con iconos a la izquierda
- Botón naranja ancho

---

## AUTENTICACIÓN {#autenticacion}

### Login (`/auth/login` — si existe como página separada)

**Estructura:**
- Centrado, max-width 420px
- Logo + "Inicia sesión"
- Email input (requerido, validado)
- Contraseña input (requerido, toggle ver/ocultar)
- Botón "Entrar"
- Link: "¿No tienes cuenta?" → `/auth/register`
- Link: "¿Olvidaste tu contraseña?" (placeholder, no implementado)

**Validaciones:**
- Email formato válido
- Contraseña no vacía
- Errors en rojo bajo los campos

**API Call:**
```
POST /auth/login { email, password }
→ { token, user: { id, name, email, role } }
```

Después: Guardar en Zustand store + redirigir a `/dashboard`

### Register (`/auth/register` — si existe como página separada)

**Estructura:**
- Centrado, max-width 420px
- Logo + "Crear cuenta"
- Nombre input
- Email input
- Teléfono input (formato +56XXXXXXXXX)
- Contraseña input (mín. 8 chars, toggle ver/ocultar)
- Botón "Crear cuenta"
- Link: "¿Ya tienes cuenta?" → `/auth/login`

**Validaciones:**
- Nombre mínimo 2 caracteres
- Email formato válido
- Teléfono formato chileno
- Contraseña mínimo 8 caracteres

**API Call:**
```
POST /auth/register { email, name, phone, password }
→ { token, user: { id, name, email, role } }
```

---

## WIZARD DE RESERVA (`/booking`) {#wizard-reserva}

Explicado en detalle en el documento `PROMPT_LARAVEL_CLIENTE.md`.

**Resumen visual aquí:**

### Header sticky
- Flecha atrás
- Progreso visual (3 pasos con números, checkmarks, títulos)
- z-50, shadow

### Paso 1: Identidad
- Email check (POST `/auth/check-email`)
- Login si existe / Register si es nuevo
- Flujo inline con transiciones

### Paso 2: Detalles del viaje
**Diferente según `pricing_mode` (zone vs commune):**

**Modo ZONE:**
- Dirección del viaje (radio buttons: al aeropuerto / desde aeropuerto)
- Fecha + hora
- Dirección libre + autodetección zona
- Selector de zona con precios por vehículo
- Selector de vehículo (con precio)
- Pasajeros + método de pago

**Modo COMMUNE:**
- Selector comuna origen → comuna destino
- Fecha + hora
- Dirección de recogida (libre)
- Dirección de destino (libre)
- Selector de vehículo (con precio de ruta)
- Pasajeros + método de pago

### Paso 3: Confirmación
- Resumen en tarjeta blanca
- Todos los detalles
- Precio grande en naranja
- Botón "Confirmar reserva"
- Pantalla de éxito con WhatsApp button

---

## DASHBOARD DEL CLIENTE (`/dashboard`) {#dashboard-cliente}

### Header
- Logo + título "AeroTaxi Chile"
- Greeting: "Hola, {FirstName}! 👋"
- Dropdown user menu (avatar + nombre)
  - Opciones: Perfil → `/profile`
  - Opciones: Mis reservas → `/mis-reservas`
  - Opciones: Cerrar sesión

### Contenido principal

**Tabs:**
- Próximas (activas)
- Historial (completadas/canceladas)

**Cada tab muestra cards de reservas** (ver `mis-reservas` para estructura completa)

**Botón flotante o sticky:** "Nueva reserva" → `/booking`

---

## MIS RESERVAS (`/mis-reservas`) {#mis-reservas}

### Header
- Flecha atrás → `/`
- Título "Mis reservas"
- Greeting "Hola {nombre}"
- Botón "+ Nueva" → `/booking`
- Tabs: Próximas | Historial (con contadores)

### Card de cada reserva

**Diseño:**
- Barra de color superior (naranja=activa, verde=completada, roja=cancelada)
- Contenido padding-5:

**Header de card:**
- Ícono de dirección (avión o pin)
- Tipo traslado: "Al aeropuerto ✈️" / "Desde aeropuerto 🛬" / "ComunaA → ComunaB"
- ID corto (últimos 6 chars, mayúsculas): `#AB12CD`
- Badge de status con color y puntito (badge-xs)

**Ruta:**
- Punto verde (origen) + línea punteada + pin naranja (destino)
- Texto de dirección origen
- Texto de dirección destino

**Detalles (grid 2x2):**
- 🗓 Fecha: "25 abr 2026 · 14:30"
- 🚗 Vehículo: "Sedan VIP"
- 👥 Pasajeros: "3 pax"
- 💰 Tarifa: "$45.000" (naranja)

**Notas del conductor (si existen):**
- Banner morado: "Nota del conductor: {texto}"

**Acciones:**
- Si status `pending`: "Editar reserva" button
- Si status `pending`/`assigned`/`confirmed`: "Cancelar" button rojo

### Editar reserva (inline panel)
Aparece debajo de la card si se hace clic en "Editar":
- Dirección libre (según tipo traslado)
- Fecha input
- Hora input
- Pasajeros input
- Botones: "Guardar cambios" | "Cancelar"
- Muestra error si falla

### Cancelar reserva (inline panel confirmación)
Aparece debajo de la card si se hace clic en "Cancelar":
- Alerta roja: "¿Cancelar esta reserva? Esta acción no se puede deshacer."
- Botones: "Sí, cancelar reserva" (rojo) | "Volver" (outline)

---

## MIS DIRECCIONES (`/mis-direcciones`) {#mis-direcciones}

### Header
- Flecha atrás → `/`
- Título "Mis direcciones"
- Subtitle: "Gestiona tus ubicaciones guardadas"
- Botón "+ Agregar" o "X Cerrar" (alterna)

### Formulario agregar (desplegable)
- Selector etiqueta: Casa | Trabajo | Aeropuerto | Otro
- Checkbox "Predeterminada"
- Input dirección con autocompletado Google Places
- Botón "Guardar dirección"
- Muestra error si es necesario

### Card de dirección
**Diseño:**
- Si es predeterminada: barra naranja arriba
- Contenido padding-4:

**Header:**
- Ícono (🏠 Casa, 💼 Trabajo, 📍 Otro)
- Etiqueta (negrita)
- Badges:
  - Si predeterminada: "⭐ Predeterminada" (naranja)
  - Si se detectó comuna: chip gris con nombre

**Dirección:**
- Texto full con leading relajado

**Botones:**
- Si no es default: "Marcar predeterminada" (outline)
- "Editar" (outline)
- "Eliminar" (rojo, outline)

### Editar inline
Panel debajo de card:
- Selector etiqueta
- Input dirección
- Botones: "Guardar cambios" | "Cancelar"

### Eliminar confirmación
Panel rojo:
- "¿Eliminar esta dirección? Esta acción no se puede deshacer."
- Botones: "Sí, eliminar" (rojo) | "Cancelar" (outline)

---

## MI PERFIL (`/profile`) {#mi-perfil}

### Header
- Flecha atrás → `/dashboard`
- Título "Mi perfil"

### Avatar card (arriba)
- Círculo naranja con iniciales
- Nombre en negrita
- Email
- Badge con rol

### Formulario edición
- Input nombre (requerido)
- Input email (requerido, validado)
- Input teléfono (opcional, formato +56XXXXXXXXX)
  - Hint: "Usado para confirmaciones de reserva por WhatsApp"
- Botón "Guardar cambios" (deshabilitado si no hay cambios)
- Toast de éxito/error

### Links de acceso rápido
- "Mis reservas" → `/mis-reservas` (card con ícono + arrow)
- "Cambiar contraseña" → disabled, "Próximamente"

---

## PANEL ADMIN (`/admin`) {#panel-admin}

### Estructura general
- **Sidebar** (izquierda, sticky): Navegación admin
- **Main** (derecha): Contenido dinámico

### Navbar admin
- Logo + "AeroTaxi Chile"
- Breadcrumb (ej: "Sistema > Configuración")
- Título de página
- Avatar user + dropdown logout

### Sidebar admin
Links a:
- Dashboard → `/admin`
- Zonas y tarifas → `/admin/zonas`
- Viajes (reservas) → `/admin/viajes`
- Clientes → `/admin/clientes`
- Conductores → `/admin/conductores`
- Usuarios → `/admin/usuarios`
- Configuración → `/admin/configuracion`
- Contenido (landing) → `/admin/contenido`

Ícono + label para cada, highlight de active

### Páginas admin

#### `/admin` — Dashboard principal
- Cards de stats: total clientes, viajes hoy, ingresos, conductores
- Gráficos de actividad
- Últimos viajes pendientes (tabla)

#### `/admin/zonas` — Zonas y tarifas
**Tabs:**
1. **Modo de tarifas** (toggle zone/commune)
   - Botones: "Zonas fijas" | "Por comunas"
   - Confirmación y toast al cambiar

2. **Zonas** (si modo zone)
   - Tabla con: nombre, comunas, precios (sedan/suv/minivan/van)
   - Click en precio → input inline con validación
   - Click en "Editar comunas" → input de text con lista separada por comas
   - Agregar zona (formulario modal)

3. **Rutas** (si modo commune)
   - Tabla con: desde-comuna, hasta-comuna, precios, estado (active/inactive)
   - Click en precio → input inline
   - Agregar ruta (modal)
   - Activar/desactivar ruta

4. **Destino principal** (siempre visible)
   - Selector tipo destino (airport/terminal/etc)
   - Input nombre (Aeropuerto AMB)
   - Input dirección
   - Botón guardar

#### `/admin/viajes` — Gestor de reservas
**Tabs:**
- Pendiente (0 conductor asignado)
- Activo (asignadas)
- Historial (completadas)
- Canceladas

**Tabla/Cards:**
- ID, Cliente, Origen-Destino, Fecha, Estado, Vehículo, Precio
- Buscador por dirección/cliente/teléfono
- Click → modal con detalles completos:
  - Botón "Asignar conductor" (modal para seleccionar)
  - Botón "Cambiar estado" (dropdown)
  - Notas admin (textarea)
  - Ver datos conductor (si asignado)
  - Botón cancelar (si cancelable)

#### `/admin/clientes` — Lista de clientes
- Tabla: ID, nombre, email, teléfono, # reservas, última reserva
- Buscador
- Click → detalle de cliente (modal):
  - Datos personales
  - Historial de reservas
  - Dirección de prueba de ubicación

#### `/admin/conductores` — Gestor de conductores
- Tabla: nombre, email, teléfono, vehículo, estado (disponible/no), rating
- Buscador
- Agregar/editar conductor (modal)
- Datos del vehículo (placa, marca, modelo, color)

#### `/admin/usuarios` — Gestor de usuarios
- Tabla: nombre, email, rol (admin/client/driver), estado (activo/inactivo)
- Buscador
- Agregar/editar usuario (modal)
  - Nombre, email, rol, contraseña
  - Validaciones

#### `/admin/configuracion` — Configuración general
**Tabs:**

**Empresa:**
- Logo (upload + preview)
- Nombre app
- Teléfono principal
- WhatsApp
- Email contacto
- Dirección empresa

**SEO:**
- Título SEO (con contador: /60)
- Descripción (con contador: /160)
- Keywords (separadas por comas)
- OG image URL
- Google Site Verification

**Integraciones:**
- GTM ID
- Google Analytics ID
- Facebook Pixel ID

Cada sección con botón "Guardar cambios" al pie.

#### `/admin/contenido` — Gestor de contenido
Edición del contenido de la landing page:
- Badge hero
- Título hero (con highlight)
- Subtítulo hero
- Items de confianza (3 textos)
- Stats (valores + labels, 4 items)
- Pasos cómo funciona (títulos + descripciones, 3 items)
- Características (6 items)
- etc.

Campos de tipo textarea/input largos.
Botón guardar.

---

## ROLES Y CONTROL DE ACCESO {#roles-acceso}

### Roles definidos

| Rol        | Acceso                                    |
|------------|-------------------------------------------|
| `client`   | `/booking`, `/dashboard`, `/mis-reservas`, `/mis-direcciones`, `/profile` |
| `admin`    | `/admin/*` (todas las páginas admin)      |
| `driver`   | `/driver` (panel de conductor)            |

### Redirecciones de seguridad

| Intento                 | Redirección       | Condición                      |
|-------------------------|-------------------|--------------------------------|
| No autenticado → `/mis-reservas` | `/auth/login` | `!user && !token`              |
| Client → `/admin`       | `/dashboard`      | `user.role !== 'admin'`        |
| Driver → `/dashboard`   | `/driver`         | `user.role === 'driver'`       |
| No autenticado → `/admin` | `/auth/login` | `!user && !token`              |

### Estado global de autenticación

**Zustand store** (`store/auth.ts`):

```typescript
interface User {
  id: string
  name: string
  email: string
  role: 'client' | 'admin' | 'driver'
}

interface AuthStore {
  user: User | null
  token: string | null
  setAuth: (user: User, token: string) => void
  clearAuth: () => void
  _hasHydrated: boolean  // Indica si el store se ha hidratado del localStorage
}
```

**Persistencia:**
- Guardado en localStorage
- Se rehidrata al recargar la página
- `_hasHydrated` evita renders mientras se carga

---

## COMPONENTES REUTILIZABLES {#componentes}

### Navbar
**Props:**
- Ninguna (accede a auth store)

**Comportamiento:**
- Desktop nav con links
- Mobile hamburger menu
- Muestra user avatar si autenticado
- Dropdown con opciones
- Close outside cuando hace click fuera

### HeroBookingWidget
**Props:**
- Ninguna

**Comportamiento:**
- Mini formulario de búsqueda
- Prerellenable por URL params
- Navega a `/booking` con parámetros

### AddressAutocomplete
**Props:**
- `value: string`
- `onChange: (v: string) => void`
- `placeholder?: string`
- `className?: string`

**Comportamiento:**
- Usa Google Places Autocomplete API
- Dropdown de sugerencias
- Selección → actualiza value

### AdminSidebar
**Props:**
- `active: string` (ej: "zonas", "viajes")
- `clearAuth: () => void`
- `router: NextRouter`

**Comportamiento:**
- Links al menu admin
- Highlight del item activo
- Logout button al pie

---

## FLUJOS DE NAVEGACIÓN {#flujos}

### Flujo 1: Usuario no autenticado entra a landing

```
Usuario → GET /
  ↓
Renderiza landing
  - Navbar muestra "Entrar"
  - Hero con booking widget
  - Click "Entrar" → /auth/login
  - Click "Reservar ahora" → /booking
```

### Flujo 2: Login y reserva

```
Usuario → Click "Entrar" o "Reservar ahora"
  ↓
GET /auth/login o GET /booking (si booking, va a Paso 1)
  ↓
Paso 1 (si en /booking): Email check
  ↓
POST /auth/check-email → login si existe / register si nuevo
  ↓
POST /auth/login o /auth/register → token + user
  ↓
Zustand: setAuth(user, token)
  ↓
Renderiza Paso 2 (detalles viaje)
  ↓
Llena campos → Paso 3
  ↓
POST /bookings → reserva creada
  ↓
Pantalla de éxito + botón WhatsApp + "Ver mis reservas"
```

### Flujo 3: Cliente autenticado ve sus reservas

```
Usuario (autenticado) → Click "Mis reservas" en navbar
  ↓
GET /mis-reservas
  ↓
useEffect: GET /bookings (con token)
  ↓
Renderiza tabs: Próximas / Historial
  ↓
Click en card → opciones editar/cancelar según status
```

### Flujo 4: Admin configura tarifas

```
Admin → GET /admin/zonas
  ↓
Renderiza tabs: Modo, Zonas, Rutas, Destino
  ↓
Click toggle "Zonas" ↔ "Comunas"
  ↓
PATCH /settings/pricing_mode { value: "zone" | "commune" }
  ↓
Renderiza sección de zonas o rutas según modo
  ↓
Click en precio → inline input
  ↓
PATCH /zones/{id} { priceSedan: 15000 }
  ↓
Toast "Guardado"
```

---

## RESPONSIVE DESIGN {#responsive}

### Breakpoints (Tailwind)

| Clase  | Media Query      | Uso                                |
|--------|------------------|------------------------------------|
| `sm`   | 640px            | Tablets pequeñas                  |
| `md`   | 768px            | Tablets                           |
| `lg`   | 1024px           | Desktops pequeños                 |
| `xl`   | 1280px           | Desktops medianos                 |

### Patrones responsive comunes

| Componente          | Mobile         | Tablet         | Desktop        |
|---------------------|----------------|----------------|----------------|
| Hero layout         | Stack vertical | Stack vertical | 2 columnas     |
| Nav links           | Hamburger      | Hamburger      | Inline         |
| Stats grid          | 2 cols         | 2 cols         | 4 cols         |
| Cómo funciona       | Stack          | 2 cols         | 3 cols         |
| Card reserva        | Full width     | Full width     | Full width     |
| Admin sidebar       | Oculto         | Oculto         | Visible        |
| Admin main          | Full width     | Full width     | Flex layout    |

### Móvil (375px ancho)

- Padding vertical/horizontal reducido
- Textos más pequeños (h1 = 2.5rem en vez de 3.75rem)
- Botones `min-h-[44px]` (touch target mínimo)
- Modales full-screen o centrados con padding
- Overflow-y en listas largas
- Hamburger menu para nav

### Desktop (1280px+)

- Padding/margins aumentados
- Colores más saturation
- Hover states en botones/links
- Sidebars visibles
- Grids con más columnas
- Tooltips en iconos

---

## ESTÁNDARES DE DISEÑO

### Espaciado

| Uso                  | Valor | Clase Tailwind |
|----------------------|-------|----------------|
| Padding card         | 1.25rem | `p-5` o `px-5 py-5` |
| Margin entre secc    | 2.5rem | `my-10` o `py-10` |
| Gap entre items      | 1rem  | `gap-4`        |
| Padding nav          | 0.5rem | `px-4 py-2`   |

### Sombras

| Uso              | Clase           |
|------------------|-----------------|
| Card normal      | `shadow-sm`     |
| Card hover       | `shadow-md`     |
| Sticky header    | `shadow-md`     |
| Dropdown         | `shadow-lg`     |

### Borders

| Uso              | Clase           |
|-----------------|-----------------|
| Card border      | `border border-slate-200` |
| Input focus      | `focus:ring-2 focus:ring-brand-400` |
| Divider          | `border-b border-slate-100` |

### Transiciones

| Uso              | Clase           |
|-----------------|-----------------|
| Color hover      | `transition-colors duration-300` |
| Opacity          | `transition-opacity duration-200` |
| All              | `transition-all duration-300` |

### Z-index estándares

| Elemento         | Z-index |
|------------------|---------|
| Navbar           | 50      |
| Sidebar          | 40      |
| Dropdown         | 30      |
| Modal overlay    | 40      |
| Modal content    | 50      |
| Toast            | 60      |

---

## INTEGRACIONES EXTERNAS

### Google Maps Places Autocomplete
- `AddressAutocomplete.tsx` lo utiliza
- API key debe estar en `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- Retorna: `address`, `lat`, `lng` (si se obtiene geometry)

### Material Symbols (Google Icons)
- Cargada via CDN en layout.tsx
- Uso: `<span className="material-symbols-outlined">icon_name</span>`
- Ejemplos: `flight_takeoff`, `directions_car`, `location_on`, `check_circle`

### Lucide React (iconos)
- Para ciertos íconos más grandes: `Plane`, `Users`, `Calendar`, `ChevronRight`, etc.
- Importables: `from 'lucide-react'`

---

## CONFIGURACIÓN Y VARIABLES DE ENTORNO

### `.env.local` (Web)

```
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WHATSAPP_NUMBER=56963552132
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<clave-publica-push>
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=<tu-api-key-google>
```

---

## PATRONES DE CÓDIGO IMPORTANTES

### Rutas protegidas

```typescript
useEffect(() => {
  if (!_hasHydrated) return
  if (!user || !token) {
    router.push('/auth/login')
    return
  }
  if (user.role !== 'admin') {
    router.push('/dashboard')
    return
  }
  // cargar datos
}, [_hasHydrated, user, token, router])
```

### Llamadas API con token

```typescript
api.get<ApiResponse<T>>('/endpoint', token)
api.post<ApiResponse<T>>('/endpoint', payload, token)
api.patch<ApiResponse<T>>('/endpoint', payload, token)
api.delete<ApiResponse<T>>('/endpoint', token)
```

### Manejo de estados de carga

```typescript
const [loading, setLoading] = useState(true)
const [data, setData] = useState<T | null>(null)
const [error, setError] = useState('')

useEffect(() => {
  setLoading(true)
  api.get(...)
    .then(res => setData(res.data))
    .catch(err => setError(err.message))
    .finally(() => setLoading(false))
}, [...])

if (loading) return <LoadingSpinner />
if (error) return <ErrorAlert msg={error} />
return <Content data={data} />
```

### Modales/Dropdowns con click-outside

```typescript
const dropdownRef = useRef<HTMLDivElement>(null)
const [open, setOpen] = useState(false)

useEffect(() => {
  const handler = (e: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setOpen(false)
    }
  }
  document.addEventListener('mousedown', handler)
  return () => document.removeEventListener('mousedown', handler)
}, [])
```

---

## RESUMEN DE CARACTERÍSTICAS CLAVE

✅ **Landing page** con hero, stats, pasos, tarifas, flota, features
✅ **Autenticación** con login inline en booking (email check → login/register)
✅ **Wizard de reserva** 3 pasos, diferente según pricing mode (zone/commune)
✅ **Dashboard cliente** con tabs próximas/historial
✅ **Mis reservas** editar/cancelar inline, notas del conductor
✅ **Mis direcciones** CRUD completo, etiquetas, predeterminada
✅ **Mi perfil** editar datos personales y teléfono
✅ **Panel admin** con 8 páginas: dashboard, zonas, viajes, clientes, conductores, usuarios, configuración, contenido
✅ **Control de acceso** por rol (client, admin, driver)
✅ **Estado global** Zustand para auth
✅ **Responsive** mobile-first, breakpoints sm/md/lg/xl
✅ **Componentes** Navbar, HeroBookingWidget, AddressAutocomplete, AdminSidebar
✅ **Integraciones** Google Maps Places, Google Icons, Lucide

---

## CHECKLIST PARA IMPLEMENTACIÓN EN LARAVEL

- [ ] Estructura de rutas (routes.php)
- [ ] Layout base (template blade)
- [ ] Landing page completa
- [ ] Autenticación (login/register controllers)
- [ ] Wizard de reserva (3 controladores o 1 con lógica)
- [ ] Dashboard cliente
- [ ] Mis reservas (CRUD)
- [ ] Mis direcciones (CRUD)
- [ ] Mi perfil (update)
- [ ] Admin panel structure
- [ ] Admin zonas/tarifas
- [ ] Admin viajes
- [ ] Admin clientes
- [ ] Admin conductores
- [ ] Admin usuarios
- [ ] Admin configuración
- [ ] Admin contenido
- [ ] Colores y estilos (Tailwind config)
- [ ] Componentes reutilizables (includes blade)
- [ ] Control de acceso (middleware)
- [ ] API calls (axios/fetch wrapper)
- [ ] Estado global (sesión/store)
- [ ] Responsive design (testing)

