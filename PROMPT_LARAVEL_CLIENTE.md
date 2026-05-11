# Prompt para implementar en Laravel — Módulo Cliente + Reservas (AeroTaxi Chile)

> Este documento describe con exactitud cómo funciona el módulo de cliente en la aplicación
> AeroTaxi Chile (Next.js + Hono API). Úsalo como referencia para reimplementarlo en Laravel.

---

## 1. CONTEXTO GENERAL

AeroTaxi Chile es un servicio de traslados al aeropuerto (y otros destinos). Los usuarios con
rol **client** pueden:

- Crear una reserva (wizard de 3 pasos)
- Ver y gestionar sus reservas (`/mis-reservas`)
- Gestionar sus direcciones guardadas (`/mis-direcciones`)
- Editar su perfil (`/profile`)

El **administrador** controla el tipo de tarificación desde el panel admin. Esa configuración
afecta directamente cómo se muestra el formulario de reserva al cliente.

---

## 2. CONFIGURACIÓN DEL ADMINISTRADOR — TIPO DE RESERVAS

### 2.1 Setting `pricing_mode`

Guardado en la tabla `settings` con la clave `pricing_mode`.

| Valor      | Descripción                                                         |
|------------|---------------------------------------------------------------------|
| `zone`     | Precios fijos por zona geográfica (zona detectada por dirección)   |
| `commune`  | Precios fijos por ruta entre comunas (origen → destino)            |

**El administrador cambia este modo en:** Admin → Zonas y Tarifas → sección "Modo de tarifas".

Al hacer clic en una de las dos opciones, se guarda inmediatamente con:
```
PATCH /settings/pricing_mode  { value: "zone" | "commune" }
```

El cambio es global e instantáneo: el formulario de reserva del cliente lo lee al cargarse.

### 2.2 Setting `destination_type` / `destination_name` / `destination_address`

El administrador también define el destino principal del servicio. Esto aplica solo en modo zona.

| Setting key           | Ejemplo                                                               |
|-----------------------|-----------------------------------------------------------------------|
| `destination_type`    | `airport` / `bus_terminal` / `train_station` / `port` / `other`      |
| `destination_name`    | `Aeropuerto AMB`                                                      |
| `destination_address` | `Aeropuerto Internacional Arturo Merino Benítez, Pudahuel`           |

Dependiendo del `destination_type`, cambian los íconos y etiquetas en el formulario:

| Tipo            | Icono "hacia"       | Icono "desde"       | Label "hacia"     | Label "desde"        |
|-----------------|---------------------|---------------------|-------------------|----------------------|
| `airport`       | flight_takeoff      | flight_land         | Al aeropuerto     | Desde aeropuerto     |
| `bus_terminal`  | directions_bus      | directions_bus      | Al terminal       | Desde terminal       |
| `train_station` | train               | train               | A la estación     | Desde estación       |
| `port`          | anchor              | anchor              | Al puerto         | Desde puerto         |
| `other`         | location_on         | location_on         | Al destino        | Desde destino        |

### 2.3 Zonas (modo `zone`)

Cada zona tiene:

```
id, name, label, priceSedan, priceSuv, priceMinivan, priceVan, comunas[]
```

- **comunas[]**: array de strings con los nombres de comunas que pertenecen a esa zona.
- Se usa para autodetección: si el usuario escribe una dirección que contiene el nombre
  de una comuna, el sistema detecta automáticamente la zona correspondiente.
- El admin puede editar los precios por vehículo directamente en la tabla (clic en precio → input inline).
- El admin puede editar las comunas de cada zona (clic en "Editar comunas" → input de texto separado por comas).

### 2.4 Rutas por comunas (modo `commune`)

Cada ruta tiene:

```
id, fromCommune, toCommune, priceSedan, priceSuv, priceMinivan, priceVan, isActive
```

- El admin crea rutas indicando comuna de origen y comuna de destino.
- Cada ruta define los 4 precios (sedan, suv, minivan, van).
- Solo las rutas con `isActive = true` aparecen en el formulario del cliente.
- En modo comunas **no hay dirección fija de destino** (aeropuerto u otro): el traslado es
  de punto A a punto B libre, ambos definidos por el usuario.

---

## 3. TIPOS DE VEHÍCULO (fijos en el sistema)

| Valor     | Nombre mostrado | Capacidad        |
|-----------|-----------------|------------------|
| `sedan`   | Sedan VIP       | Hasta 4 pasajeros |
| `suv`     | SUV             | Hasta 5 pasajeros |
| `minivan` | Minivan         | Hasta 7 pasajeros |
| `van`     | Van             | Hasta 12 pasajeros |

---

## 4. FORMULARIO DE RESERVA — WIZARD DE 3 PASOS

URL: `/booking`

Al entrar a esta página, primero se hace una llamada paralela a:
- `GET /zones` — lista de zonas con precios
- `GET /settings` — para obtener `pricing_mode`, `destination_type`, `destination_name`, `destination_address`
- `GET /commune-routes` — rutas activas entre comunas (solo se usan si `pricing_mode = commune`)

Si el usuario ya está autenticado (tiene sesión/token), se salta el Paso 1 y va directo al Paso 2.

---

### PASO 1 — Identificación del usuario

**Objetivo:** Autenticar o registrar al usuario antes de poder continuar.

#### Flujo:

1. Se muestra un campo de **email** con un botón "Continuar".
2. Al hacer submit, se llama a:
   ```
   POST /auth/check-email  { email: "x@x.com" }
   → { data: { exists: boolean, firstName: string | null } }
   ```
3. Según la respuesta:

   **Si `exists = true` (usuario ya registrado):**
   - Se muestra un banner verde: "¡Hola, {firstName}! 👋 · Cuenta encontrada"
   - Aparece campo de **contraseña** con toggle de ver/ocultar.
   - Al submit: `POST /auth/login { email, password }` → devuelve `{ token, user }`
   - Botón "← Usar otro email" para volver al paso de email.

   **Si `exists = false` (usuario nuevo):**
   - Banner azul: "¡Te damos la bienvenida! 🎉 · Crea tu cuenta con {email}"
   - Aparecen campos: **Nombre completo**, **Teléfono** (+56XXXXXXXXX), **Contraseña** (mín. 8 chars)
   - Al submit: `POST /auth/register { email, name, phone, password }` → devuelve `{ token, user }`
   - Botón "← Usar otro email" para volver.

4. Al autenticarse correctamente (login o registro), se avanza automáticamente al **Paso 2**.

**Validaciones:**
- Email es requerido y válido.
- Password mínimo 8 caracteres en registro.
- Teléfono formato `+56XXXXXXXXX` (9 dígitos chilenos).

---

### PASO 2 — Detalles del viaje

**Aquí el formulario es COMPLETAMENTE DIFERENTE según el `pricing_mode`.**

---

#### PASO 2 — MODO ZONA (`pricing_mode = "zone"`)

**Secciones que aparecen (en orden):**

##### A) Tipo de traslado (dirección del viaje)
Dos botones de selección excluyente:
- `to_airport` → "Al aeropuerto" / "Casa → AMB" (o según `destination_type`)
- `from_airport` → "Desde aeropuerto" / "AMB → Casa"

Al cambiar dirección:
- Si `to_airport`: campo **Origen** queda libre (usuario escribe), campo **Destino** se
  rellena automáticamente con `destination_address` y se bloquea (solo lectura).
- Si `from_airport`: campo **Origen** se rellena con `destination_address` y se bloquea.
  Campo **Destino** queda libre.

##### B) Fecha y hora
- **Fecha de recogida** (input type="date", mínimo hoy)
- **Hora** (input type="time")

Ambos requeridos para avanzar.

##### C) Ruta (direcciones)
- **Dirección de recogida** (Origen): si `to_airport`, campo libre con autocompletado.
  Si `from_airport`, muestra el nombre del destino en solo lectura.
- **Dirección de destino**: si `to_airport`, muestra nombre del destino en solo lectura.
  Si `from_airport`, campo libre con autocompletado.

El autocompletado de direcciones usa la API de Google Maps Places Autocomplete.

##### D) Zona de servicio
- Selector `<select>` con todas las zonas disponibles.
- **Autodetección:** mientras el usuario escribe en el campo de dirección libre, el sistema
  busca si alguna palabra del texto coincide con una de las comunas de alguna zona.
  Si detecta, selecciona automáticamente esa zona y muestra un banner verde:
  "Zona detectada: {zona.label} · Puedes cambiarla".
- Si se detecta una zona, el usuario puede igualmente cambiarla manualmente.
- Al seleccionar una zona, aparece una mini-tabla con los precios de los 4 vehículos para esa zona.

##### E) Tipo de vehículo
Grid 2×2 con los 4 tipos de vehículo. Cada card muestra:
- Ícono + nombre + capacidad
- Si hay zona seleccionada: el precio para ese vehículo en esa zona

Al seleccionar un vehículo, aparece un banner naranja con "Tu tarifa estimada: $XX.XXX CLP".

##### F) Detalles adicionales
- **Pasajeros** (número, 1-12)
- **Método de pago**: `cash` (Efectivo) o `online` (Pago online)

##### Validaciones al avanzar al Paso 3 (modo zona):
- La dirección libre no puede estar vacía ni ser igual a `destination_address`.
- Debe haber una zona seleccionada (`zoneId` no vacío).
- Fecha y hora son requeridos.

---

#### PASO 2 — MODO COMUNAS (`pricing_mode = "commune"`)

**Secciones que aparecen (en orden):**

##### A) Ruta del traslado (selector de comunas)
Dos selectores en grid 2 columnas:
- **Desde (comuna)**: lista de comunas únicas disponibles como origen en las rutas activas.
  Al cambiar, se resetea el selector de destino.
- **Hasta (comuna)**: lista de comunas de destino disponibles para el origen seleccionado
  (filtrada de las rutas que tienen ese `fromCommune`).
  Al seleccionar, busca la ruta `{ fromCommune, toCommune }` y guarda el `communeRouteId`.

Al tener una ruta seleccionada, aparece debajo de los selectores una mini-tabla con los
precios de los 4 vehículos para esa ruta.

**No hay botones de dirección (to/from)** porque en modo comunas el traslado siempre
es de un punto A a un punto B libre.

##### B) Fecha y hora
Mismo que modo zona: fecha (mín. hoy) + hora.

##### C) Ruta (direcciones físicas)
- **Dirección de recogida**: campo libre de texto (con autocompletado Google Maps). Siempre libre.
- **Dirección de destino**: campo libre de texto (con autocompletado Google Maps). Siempre libre.

No hay campos en solo lectura en modo comunas.

##### D) Tipo de vehículo
Mismo que modo zona: grid 2×2. Muestra precio de la ruta de comunas si hay ruta seleccionada.

##### E) Detalles adicionales
Mismo que modo zona: pasajeros (1-12) + método de pago.

##### Validaciones al avanzar al Paso 3 (modo comunas):
- `fromCommune` requerido.
- `toCommune` requerido.
- `communeRouteId` requerido (si no existe ruta para esa combinación, error).
- `origin` (dirección de recogida) requerido.
- `destination` (dirección de destino) requerido.
- Fecha y hora requeridos.

---

### PASO 3 — Revisión y confirmación

Muestra un resumen con todos los datos:

| Campo           | Valor                                      |
|-----------------|--------------------------------------------|
| Traslado        | "Al aeropuerto" / "Desde aeropuerto" / "ComunaA → ComunaB" |
| Fecha           | dd de MMMM yyyy · HH:mm (con locale es)   |
| Recogida        | Dirección de origen                        |
| Destino         | Dirección de destino                       |
| Zona / Ruta     | Nombre de zona o "ComunaA → ComunaB"       |
| Vehículo        | Sedan VIP / SUV / Minivan / Van            |
| Pasajeros       | Número                                     |
| Pago            | Efectivo / Online                          |

Al pie: tarifa estimada grande en naranja.

**Botón "Confirmar reserva"** → llama a:

**Modo zona:**
```
POST /bookings {
  direction: "to_airport" | "from_airport",
  origin: string,
  destination: string,
  zoneId: string,
  vehicleType: "sedan" | "suv" | "minivan" | "van",
  passengerCount: number,
  paymentMethod: "cash" | "online",
  scheduledAt: "YYYY-MM-DDTHH:mm:00"
}
```

**Modo comunas:**
```
POST /bookings {
  direction: "to_destination",
  origin: string,
  destination: string,
  communeRouteId: string,
  vehicleType: "sedan" | "suv" | "minivan" | "van",
  passengerCount: number,
  paymentMethod: "cash" | "online",
  scheduledAt: "YYYY-MM-DDTHH:mm:00"
}
```

La respuesta devuelve la reserva creada con `id`, `totalPrice`, etc.

---

### PANTALLA DE CONFIRMACIÓN (post-submit)

Después de crear la reserva con éxito, se reemplaza el wizard por una pantalla de éxito:

- Ícono verde de check animado.
- Título "¡Reserva creada!"
- Subtítulo "Tu solicitud fue recibida. Confirma por WhatsApp para asegurar tu conductor."
- Resumen de la reserva: `#ID` (últimos 6 chars en mayúsculas), fecha, origen, destino, vehículo.
- Precio en naranja.
- **Botón "Confirmar por WhatsApp"**: abre `https://wa.me/{WHATSAPP_NUMBER}?text=...`
  con un mensaje preformateado que incluye todos los detalles de la reserva.
- **Botón "Ver mis reservas"**: navega a `/dashboard` (o `/mis-reservas`).

El mensaje de WhatsApp incluye:
```
¡Hola! Confirmo mi reserva *AeroTaxi Chile*:

🆔 Reserva: *#XXXXXX*
🗓 Fecha: *dd de MMMM yyyy 'a las' HH:mm*
📍 Al Aeropuerto ✈️ / Desde Aeropuerto 🛬 / ComunaA → ComunaB
🏠 Desde: {origin}
🏁 Hasta: {destination}
🚗 Vehículo: *Sedan VIP*
👥 Pasajeros: 2
💰 Tarifa: *$45.000 CLP*
💳 Pago: Efectivo

Quedo atento/a a la confirmación. ¡Gracias!
```

---

## 5. MENÚ Y NAVEGACIÓN DEL CLIENTE (una vez autenticado)

Un usuario con rol `client` tiene acceso a las siguientes páginas:

| Ruta              | Nombre          | Descripción                                           |
|-------------------|-----------------|-------------------------------------------------------|
| `/`               | Landing         | Página pública con botón de reservar                 |
| `/booking`        | Reservar        | Wizard de reserva (3 pasos)                          |
| `/dashboard`      | Dashboard       | Panel principal del cliente (resumen de reservas)    |
| `/mis-reservas`   | Mis reservas    | Lista completa de reservas con tabs                  |
| `/mis-direcciones`| Mis direcciones | CRUD de direcciones guardadas                        |
| `/profile`        | Mi perfil       | Editar datos personales                              |

**Redirecciones por rol:**
- Si un cliente intenta ir a `/admin/*` → redirige a `/dashboard`.
- Si un no-autenticado intenta ir a `/mis-reservas` o `/mis-direcciones` → redirige a `/auth/login`.
- Los conductores (`driver`) van a `/driver` (panel de conductor).

---

## 6. MÓDULO MIS RESERVAS (`/mis-reservas`)

### 6.1 Carga de datos
```
GET /bookings?pageSize=100  (con Authorization: Bearer {token})
→ array de bookings del usuario autenticado
```

### 6.2 Estructura de cada reserva

```typescript
{
  id: string                    // UUID
  direction: "to_airport" | "from_airport" | "to_destination"
  origin: string                // Dirección de recogida
  destination: string           // Dirección de destino
  scheduledAt: string           // ISO datetime
  passengerCount: number
  vehicleType: "sedan" | "suv" | "minivan" | "van"
  totalPrice: number            // En CLP
  paymentMethod: "cash" | "online"
  status: string                // Ver tabla de estados
  adminNotes: string | null     // Notas del administrador
  driverNotes: string | null    // Notas del conductor (se muestran al cliente)
  createdAt: string
}
```

### 6.3 Estados de reserva

| Estado      | Label mostrado        | Color badge           |
|-------------|----------------------|-----------------------|
| `pending`   | Pendiente            | Amber/amarillo        |
| `assigned`  | Conductor asignado   | Azul                  |
| `confirmed` | Confirmado           | Índigo                |
| `en_route`  | En camino            | Cyan                  |
| `completed` | Completado           | Verde                 |
| `cancelled` | Cancelado            | Rojo                  |
| `settled`   | Liquidado            | Slate/gris            |
| `rejected`  | Rechazado            | Naranja               |

### 6.4 Tabs en la página

- **Próximas**: reservas con status `pending`, `assigned`, `confirmed`, `en_route`
- **Historial**: reservas con status `completed`, `settled`, `cancelled`, `rejected`

Cada tab muestra un contador de reservas.

### 6.5 Tarjeta de reserva

Cada reserva se muestra en una tarjeta con:
- Barra de color superior (naranja=activa, verde=completada, roja=cancelada)
- Ícono de dirección (avión despegando=to_airport, aterrizando=from_airport)
- ID corto (últimos 6 chars en mayúsculas): `#AB12CD`
- Badge de estado con color y punto de color
- Ruta origen → destino (punto verde → pin naranja)
- Grid de detalles: fecha, tipo vehículo, nro pasajeros, tarifa
- Si hay `driverNotes`: banner morado con "Nota del conductor"

### 6.6 Acciones sobre la reserva

#### Editar reserva
- **Disponible cuando**: `status = "pending"` (solo en pendiente)
- **Qué se puede editar**: fecha, hora, número de pasajeros, y solo la dirección "libre"
  (en `to_airport` → se puede editar el origen; en `from_airport` → se puede editar el destino).
  La dirección del aeropuerto/destino fijo NO se puede cambiar.
- Se muestra un panel colapsado debajo de la tarjeta con los campos de edición.
- Al guardar: `PATCH /bookings/{id}/edit { scheduledAt, passengerCount, origin? | destination? }`
- El formulario de edición no reabre el wizard completo, es un mini-formulario inline.

#### Cancelar reserva
- **Disponible cuando**: `status` es `pending`, `assigned` o `confirmed` (NO en `en_route`)
- Al hacer clic en "Cancelar", aparece un panel rojo de confirmación: "¿Cancelar esta reserva?
  Esta acción no se puede deshacer."
- Botones: "Sí, cancelar reserva" (rojo) / "Volver" (outline rojo)
- Al confirmar: `PATCH /bookings/{id}/cancel {}`

### 6.7 Estado vacío
- Si no hay reservas próximas: ícono de calendario + "No tienes reservas próximas" + botón "Reservar ahora" → `/booking`
- Si no hay historial: ícono de avión + "Sin historial de viajes"

### 6.8 Header de la página
- Flecha volver → `/`
- Título "Mis reservas" + "Hola {nombre}! 👋"
- Botón "+ Nueva" → `/booking`

---

## 7. MÓDULO MIS DIRECCIONES (`/mis-direcciones`)

### 7.1 Carga de datos
```
GET /addresses  (con Authorization: Bearer {token})
→ array de direcciones del usuario
```

### 7.2 Estructura de una dirección

```typescript
{
  id: string
  label: string          // "Casa" | "Trabajo" | "Aeropuerto" | "Otro"
  address: string        // Dirección completa como texto libre
  comunaDetected: string | null  // Comuna detectada automáticamente (informativo)
  zoneId: string | null          // Zona detectada (informativo)
  isDefault: boolean             // Si es la dirección predeterminada
  createdAt: string
}
```

### 7.3 Funcionalidades

#### Agregar dirección
- Botón "+ Agregar" en el header → despliega un formulario en la parte superior de la lista.
- Campos:
  - **Etiqueta**: select con opciones `Casa`, `Trabajo`, `Aeropuerto`, `Otro`
  - **Predeterminada**: checkbox
  - **Dirección completa**: texto libre (con placeholder "Ej: Av. Las Condes 1234, Las Condes")
- Al guardar: `POST /addresses { label, address, isDefault }`

#### Tarjeta de dirección
Cada dirección muestra:
- Ícono según etiqueta: Casa→🏠, Trabajo→💼, otros→📍
- Nombre de la etiqueta en negrita
- Si `isDefault`: badge naranja "⭐ Predeterminada"
- Si `comunaDetected`: chip gris con el nombre de la comuna
- Texto de la dirección completa
- Botones: "Predeterminada" (si no lo es), "Editar", "Eliminar"

#### Marcar como predeterminada
- Solo aparece si `isDefault = false`
- `PATCH /addresses/{id} { isDefault: true }`

#### Editar inline
- Aparece un panel debajo de la tarjeta con los mismos campos (etiqueta + dirección)
- NO tiene checkbox de predeterminada en la edición
- `PATCH /addresses/{id} { label, address }`

#### Eliminar
- Confirmación con panel rojo: "¿Eliminar esta dirección? Esta acción no se puede deshacer."
- `DELETE /addresses/{id}`

### 7.4 Estado vacío
- "Sin direcciones guardadas"
- Subtexto: "Guarda tus ubicaciones frecuentes para reservar más rápido"
- Botón "Agregar primera dirección"

---

## 8. MÓDULO MI PERFIL (`/profile`)

### 8.1 Carga de datos
```
GET /profile  (con Authorization: Bearer {token})
→ { id, name, email, phone, role }
```

### 8.2 Estructura visual

**Card de avatar** (arriba):
- Círculo naranja con las iniciales del usuario (primeras letras de las primeras 2 palabras del nombre, en mayúsculas)
- Nombre completo + email
- Badge con el rol: "Cliente" (para `client`)

**Formulario de edición:**
- **Nombre completo**: requerido, mínimo 2 caracteres, máximo 100
- **Correo electrónico**: requerido, formato válido
- **Teléfono WhatsApp**: opcional, formato `+56XXXXXXXXX` (exactamente 9 dígitos después del prefijo)
  - Hint: "Usado para confirmaciones de reserva por WhatsApp"
- Botón "Guardar cambios": deshabilitado si no hay cambios (isDirty=false) o si está guardando.
- Al guardar: `PUT /profile { name, email, phone? }`
- Después de guardar, actualiza el nombre en el store global (para que el header se actualice).
- Muestra toast de éxito/error durante 3.5 segundos.

**Links de acceso rápido:**
- "Mis reservas" → `/dashboard`
- "Cambiar contraseña" → deshabilitado (placeholder, "Próximamente")

### 8.3 Validaciones

| Campo    | Regla                                       |
|----------|---------------------------------------------|
| name     | mín 2, máx 100                              |
| email    | email válido                                |
| phone    | `/^\+?56[0-9]{9}$/` o vacío                 |

---

## 9. TABLA `settings` — Claves relevantes para el cliente

La tabla `settings` es un key-value store. Estas son las claves que afectan al módulo cliente:

| Key                      | Tipo     | Descripción                                      |
|--------------------------|----------|--------------------------------------------------|
| `pricing_mode`           | string   | `"zone"` o `"commune"`                           |
| `destination_type`       | string   | `"airport"`, `"bus_terminal"`, etc.              |
| `destination_name`       | string   | Nombre del destino, ej: `"Aeropuerto AMB"`       |
| `destination_address`    | string   | Dirección completa del destino fijo              |
| `app_name`               | string   | Nombre de la app                                 |
| `phone_whatsapp`         | string   | Número de WhatsApp para confirmaciones           |

---

## 10. FLUJO COMPLETO DE UNA RESERVA (resumen visual)

```
CLIENTE entra a /booking
    │
    ├── (si no está autenticado)
    │       Paso 1: Email → Login/Registro
    │
    ├── (si ya está autenticado)
    │       Salta directo al Paso 2
    │
    Paso 2: Formulario de viaje
    │
    │   [Si pricing_mode = "zone"]
    │   ┌─────────────────────────────────────────────────────┐
    │   │ 1. Dirección del viaje (al aeropuerto / desde)      │
    │   │ 2. Fecha y hora                                     │
    │   │ 3. Dirección libre (recogida o entrega)             │
    │   │    → autodetecta zona mientras escribe              │
    │   │ 4. Zona (select + precios por vehículo)             │
    │   │ 5. Tipo de vehículo (con precio)                    │
    │   │ 6. Pasajeros + método de pago                       │
    │   └─────────────────────────────────────────────────────┘
    │
    │   [Si pricing_mode = "commune"]
    │   ┌─────────────────────────────────────────────────────┐
    │   │ 1. Seleccionar DESDE (comuna) → precios             │
    │   │    Seleccionar HASTA (comuna)                       │
    │   │    → muestra precios por vehículo de la ruta        │
    │   │ 2. Fecha y hora                                     │
    │   │ 3. Dirección de recogida (libre)                    │
    │   │ 4. Dirección de destino (libre)                     │
    │   │ 5. Tipo de vehículo (con precio)                    │
    │   │ 6. Pasajeros + método de pago                       │
    │   └─────────────────────────────────────────────────────┘
    │
    Paso 3: Resumen + Confirmar
    │
    POST /bookings → reserva creada
    │
    Pantalla de éxito
    ├── Botón WhatsApp (mensaje preformateado)
    └── Botón "Ver mis reservas"
```

---

## 11. APIs NECESARIAS (resumen para Laravel)

### Públicas (sin autenticación)
```
POST   /auth/check-email        { email }
POST   /auth/login              { email, password }
POST   /auth/register           { email, name, phone, password }
GET    /zones                   → lista de zonas activas
GET    /settings                → todos los settings
GET    /commune-routes          → rutas activas entre comunas
```

### Autenticadas (Bearer token)
```
# Reservas
POST   /bookings                Crear reserva (payload según modo)
GET    /bookings?pageSize=100   Reservas del usuario autenticado
PATCH  /bookings/{id}/edit      Editar (solo pending): scheduledAt, passengerCount, origin/destination
PATCH  /bookings/{id}/cancel    Cancelar (pending/assigned/confirmed)

# Perfil
GET    /profile                 Datos del usuario autenticado
PUT    /profile                 Actualizar nombre, email, teléfono

# Direcciones
GET    /addresses               Direcciones del usuario
POST   /addresses               Crear dirección { label, address, isDefault }
PATCH  /addresses/{id}          Editar { label?, address?, isDefault? }
DELETE /addresses/{id}          Eliminar
```

### Solo admin
```
GET/PATCH /settings/{key}       Leer/actualizar un setting
GET       /zones                Lista completa
PATCH     /zones/{id}           Editar precios
PATCH     /zones/{id}/comunas   Editar comunas de una zona
GET       /commune-routes/all   Todas las rutas (incluyendo inactivas)
POST      /commune-routes       Crear ruta
PATCH     /commune-routes/{id}  Editar ruta
DELETE    /commune-routes/{id}  Eliminar ruta
```

---

## 12. NOTAS IMPORTANTES PARA LA IMPLEMENTACIÓN EN LARAVEL

1. **El `pricing_mode` es global y lo lee el formulario en tiempo de carga**. No está en la
   sesión del usuario ni en la URL. El admin lo cambia y afecta a todos los nuevos formularios.

2. **La autodetección de zona** se hace en el frontend: al escribir en el campo de dirección,
   se busca si el texto contiene alguna de las comunas registradas en las zonas. Es una búsqueda
   de substring case-insensitive. Si coincide, se preselecciona esa zona (el usuario puede cambiarla).

3. **En modo zona, uno de los campos de dirección siempre es fijo (solo lectura)**:
   - `to_airport`: destino = aeropuerto (fijo), origen = libre
   - `from_airport`: origen = aeropuerto (fijo), destino = libre

4. **En modo comunas, ambas direcciones son libres**. Solo las comunas determinan la tarifa;
   las direcciones de texto son para el conductor.

5. **El precio se calcula en el backend** al crear la reserva, basándose en:
   - Modo zona: `zones.price{VehicleType}` donde `zoneId` es el enviado por el cliente
   - Modo comunas: `commune_routes.price{VehicleType}` donde `communeRouteId` es el enviado

6. **La barra de progreso del wizard** (pasos 1→2→3) es visual: los pasos previos muestran
   un ícono de check verde, el paso actual es naranja/brand, los siguientes son grises.

7. **Los estados editables y cancelables son diferentes**:
   - Solo `pending` → se puede editar
   - `pending`, `assigned`, `confirmed` → se puede cancelar
   - `en_route`, `completed`, `settled`, `rejected` → sin acciones del cliente

8. **El wizard recibe parámetros opcionales por URL** (`?direction=to_airport&date=2025-05-15&time=10:30&zoneId=xxx&vehicleType=sedan`) para prerellenar el formulario desde la landing page.

9. **Las notas del conductor** (`driverNotes`) se muestran al cliente en su tarjeta de reserva.
   Las notas del administrador (`adminNotes`) son internas y NO se muestran al cliente.

10. **El número de WhatsApp** se configura via setting `phone_whatsapp` (o via variable de entorno
    `NEXT_PUBLIC_WHATSAPP_NUMBER`). Se usa en el mensaje de confirmación post-reserva.
