# 📋 Plan de Migración Aerotaxi a Laravel

## 📊 Información del Proyecto Actual

- **Backend**: Hono.js + Drizzle ORM + PostgreSQL
- **Frontend**: Next.js 16 + React 19
- **Tamaño**: ~2,000 líneas API + ~1,300 líneas Frontend
- **Tablas BD**: 11 tablas (users, drivers, vehicles, addresses, bookings, etc)
- **Endpoints**: 13 routers (auth, bookings, drivers, etc)
- **Integraciones**: Firebase Admin, Google Maps, Web Push

---

## 🎯 Objetivos de la Migración

1. ✅ Migrar todo el backend a Laravel 11
2. ✅ Mantener la base de datos PostgreSQL
3. ✅ Mantener todas las funcionalidades idénticas
4. ✅ Frontend: Opción A (mantener Next.js) o Opción B (migrar a Laravel Blade)
5. ✅ Preservar integraciones externas (Firebase, Google Maps, etc)

---

## 📐 Stack Laravel Resultante

```
Backend:
- Laravel 11 + PHP 8.3+
- PostgreSQL (mantener)
- Sanctum (JWT para API)
- Eloquent ORM
- Queues (para notificaciones push)
- Storage (para uploads)

Frontend:
- OPCIÓN A: Next.js (mantener, sin cambios)
- OPCIÓN B: Laravel Blade + AlpineJS (todo en Laravel)
```

---

## 🔄 Plan de Migración Paso a Paso

### FASE 1: Preparación (1-2 días)

#### 1.1 Crear proyecto Laravel
```bash
composer create-project laravel/laravel aerotaxi-laravel
cd aerotaxi-laravel
```

#### 1.2 Configurar base de datos
```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=aerotaxichile
DB_USERNAME=user
DB_PASSWORD=password
```

#### 1.3 Instalar dependencias necesarias
```bash
composer require laravel/sanctum
composer require firebase/php-jwt
composer require minishlink/web-push
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

---

### FASE 2: Migración de Base de Datos (2-3 días)

#### 2.1 Crear Migraciones

**Carpeta**: `database/migrations/`

**Orden de creación**:
1. users + enums (user_role)
2. drivers (FK → users)
3. vehicles + enums (vehicle_type)
4. zones + enums (zone_name)
5. addresses (FK → users)
6. commune_routes
7. bookings + enums (booking_status, payment_status, etc)
8. booking_status_history
9. notifications
10. push_subscriptions
11. settings

**Ejemplo Migración de Users**:
```php
Schema::create('users', function (Blueprint $table) {
    $table->string('id')->primary();
    $table->string('name');
    $table->string('email')->unique();
    $table->string('phone');
    $table->string('password');
    $table->enum('role', ['client', 'driver', 'admin'])->default('client');
    $table->boolean('is_active')->default(true);
    $table->string('photo_url')->nullable();
    $table->timestamps();
});
```

#### 2.2 Crear Modelos Eloquent

**Carpeta**: `app/Models/`

```
- User.php (rol, relaciones)
- Driver.php
- Vehicle.php
- Address.php
- Booking.php
- Zone.php
- Notification.php
- PushSubscription.php
- Setting.php
```

**Ejemplo**:
```php
class User extends Authenticatable {
    use HasApiTokens, HasFactory;
    
    protected $fillable = ['name', 'email', 'phone', 'password', 'role'];
    protected $hidden = ['password'];
    
    public function driver() {
        return $this->hasOne(Driver::class);
    }
    public function bookings() {
        return $this->hasMany(Booking::class);
    }
}
```

---

### FASE 3: Migración de Lógica de Negocios (4-5 días)

#### 3.1 Controladores

**Carpeta**: `app/Http/Controllers/API/`

Crear controladores para cada router:

```
- AuthController.php (register, login, check-email)
- BookingsController.php (create, update, list, etc)
- DriversController.php (profile, availability, etc)
- VehiclesController.php (list, create, update)
- AddressesController.php (CRUD)
- ZonesController.php (list)
- ProfileController.php (get, update)
- NotificationsController.php (list, mark as read)
- UploadsController.php (file uploads)
- SettingsController.php (get, update)
- UsersController.php (admin)
- CommuneRoutesController.php (list, pricing)
- PushController.php (subscribe, send)
```

#### 3.2 Servicios (Business Logic)

**Carpeta**: `app/Services/`

```
- AuthService.php
  - register()
  - login()
  - validateEmail()
  
- BookingService.php
  - createBooking()
  - updateStatus()
  - calculatePrice()
  - assignDriver()
  
- NotificationService.php
  - sendPush()
  - sendEmail()
  - recordNotification()
  
- UploadService.php
  - handleFileUpload()
```

#### 3.3 Requests (Validación)

**Carpeta**: `app/Http/Requests/`

Usar Form Requests de Laravel en lugar de Zod:

```
- RegisterRequest.php
- LoginRequest.php
- CreateBookingRequest.php
- UpdateProfileRequest.php
```

Ejemplo:
```php
class RegisterRequest extends FormRequest {
    public function rules() {
        return [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'phone' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ];
    }
}
```

#### 3.4 Jobs (Procesos Asincronos)

**Carpeta**: `app/Jobs/`

```
- SendPushNotificationJob.php
- SendEmailNotificationJob.php
- ProcessBookingStatusChangeJob.php
```

---

### FASE 4: API Routes (1-2 días)

**Archivo**: `routes/api.php`

```php
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/check-email', [AuthController::class, 'checkEmail']);

Route::middleware('auth:sanctum')->group(function () {
    // Auth Routes
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    
    // Profile Routes
    Route::get('/profile', [ProfileController::class, 'show']);
    Route::put('/profile', [ProfileController::class, 'update']);
    
    // Bookings Routes
    Route::get('/bookings', [BookingsController::class, 'index']);
    Route::post('/bookings', [BookingsController::class, 'store']);
    Route::get('/bookings/{id}', [BookingsController::class, 'show']);
    Route::put('/bookings/{id}', [BookingsController::class, 'update']);
    Route::post('/bookings/{id}/cancel', [BookingsController::class, 'cancel']);
    
    // Drivers Routes
    Route::get('/drivers', [DriversController::class, 'index']);
    Route::get('/drivers/{id}', [DriversController::class, 'show']);
    Route::put('/drivers/{id}', [DriversController::class, 'update']);
    Route::post('/drivers/{id}/availability', [DriversController::class, 'updateAvailability']);
    
    // Vehicles Routes
    Route::get('/vehicles', [VehiclesController::class, 'index']);
    Route::post('/vehicles', [VehiclesController::class, 'store']);
    Route::put('/vehicles/{id}', [VehiclesController::class, 'update']);
    
    // Addresses Routes
    Route::get('/addresses', [AddressesController::class, 'index']);
    Route::post('/addresses', [AddressesController::class, 'store']);
    Route::delete('/addresses/{id}', [AddressesController::class, 'destroy']);
    
    // Zones Routes
    Route::get('/zones', [ZonesController::class, 'index']);
    
    // Notifications Routes
    Route::get('/notifications', [NotificationsController::class, 'index']);
    Route::post('/notifications/{id}/read', [NotificationsController::class, 'markAsRead']);
    
    // Push Routes
    Route::post('/push/subscribe', [PushController::class, 'subscribe']);
    Route::post('/push/unsubscribe', [PushController::class, 'unsubscribe']);
    
    // Uploads Routes
    Route::post('/uploads', [UploadsController::class, 'store']);
    
    // Settings Routes
    Route::get('/settings', [SettingsController::class, 'index']);
    Route::post('/settings', [SettingsController::class, 'store']);
    
    // Commune Routes Routes
    Route::get('/commune-routes', [CommuneRoutesController::class, 'index']);
    
    // Users Routes (admin only)
    Route::middleware('admin')->group(function () {
        Route::get('/users', [UsersController::class, 'index']);
        Route::post('/users', [UsersController::class, 'store']);
        Route::put('/users/{id}', [UsersController::class, 'update']);
    });
});

// Public Routes
Route::get('/health', function () {
    return response()->json(['status' => 'ok', 'timestamp' => now()->toIso8601String()]);
});
```

---

### FASE 5: Middleware & Authentication (1-2 días)

**Archivo**: `app/Http/Middleware/`

```php
// CheckAdminRole.php
public function handle($request, Closure $next) {
    if ($request->user()?->role !== 'admin') {
        return response()->json(['error' => 'Unauthorized'], 403);
    }
    return $next($request);
}

// CheckDriverRole.php
public function handle($request, Closure $next) {
    if ($request->user()?->role !== 'driver') {
        return response()->json(['error' => 'Only drivers'], 403);
    }
    return $next($request);
}
```

Register en `app/Http/Kernel.php`:
```php
protected $routeMiddleware = [
    'admin' => \App\Http\Middleware\CheckAdminRole::class,
    'driver' => \App\Http\Middleware\CheckDriverRole::class,
];
```

---

### FASE 6: Integraciones Externas (2-3 días)

#### 6.1 Firebase Admin SDK
```php
// app/Services/FirebaseService.php
use Kreait\Firebase\Factory;

class FirebaseService {
    protected $firebase;
    
    public function __construct() {
        $this->firebase = (new Factory)
            ->withServiceAccount(config('services.firebase.credentials'))
            ->create();
    }
    
    public function sendNotification($userId, $title, $body) {
        // Implementar lógica
    }
}
```

#### 6.2 Web Push Notifications
```php
// app/Services/WebPushService.php
use Minishlink\WebPush\WebPush;

class WebPushService {
    public function send($subscription, $title, $body) {
        // Usar minishlink/web-push
    }
}
```

#### 6.3 Google Maps API
```php
// Mantener en frontend (Next.js)
// Google Maps JS API funciona igual
```

---

### FASE 7: Frontend (Variable según opción)

#### OPCIÓN A: Mantener Next.js (Recomendado)
- ✅ No cambiar nada
- ✅ Next.js sigue siendo SPA separada
- ✅ Llamadas a `http://laravel-api.local/api/...`
- ✅ Mismo flujo de desarrollo

#### OPCIÓN B: Migrar a Laravel Blade
- Crear rutas web en `routes/web.php`
- Usar Blade templates para vistas
- Usar AlpineJS o Livewire para interactividad
- Más complejo, pero todo en Laravel

**Recomendación**: OPCIÓN A (mantener Next.js)

---

## 🔧 Configuración Essential de Laravel

### .env
```env
APP_NAME="Aerotaxi"
APP_ENV=production
APP_DEBUG=false
APP_KEY=base64:... (php artisan key:generate)

DB_CONNECTION=pgsql
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=aerotaxichile
DB_USERNAME=user
DB_PASSWORD=password

CORS_ALLOWED_ORIGINS=http://localhost:3000

FIREBASE_CREDENTIALS_PATH=/path/to/firebase.json
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

JWT_SECRET=... (cambiar en producción)
```

### config/cors.php
```php
'allowed_origins' => explode(',', env('CORS_ALLOWED_ORIGINS', 'http://localhost:3000')),
'supports_credentials' => true,
```

---

## 📦 Estructura Final de Carpetas

```
aerotaxi-laravel/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── API/
│   │   │       ├── AuthController.php
│   │   │       ├── BookingsController.php
│   │   │       ├── DriversController.php
│   │   │       └── ...
│   │   ├── Middleware/
│   │   └── Requests/
│   ├── Models/
│   │   ├── User.php
│   │   ├── Driver.php
│   │   ├── Booking.php
│   │   └── ...
│   ├── Services/
│   │   ├── AuthService.php
│   │   ├── BookingService.php
│   │   ├── NotificationService.php
│   │   └── ...
│   └── Jobs/
│       ├── SendPushNotificationJob.php
│       └── ...
├── database/
│   ├── migrations/
│   ├── seeders/
│   └── factories/
├── routes/
│   ├── api.php (todas las rutas API)
│   └── web.php (opcional, si se usa Blade)
├── config/
│   ├── cors.php
│   ├── sanctum.php
│   └── services.php
├── storage/
│   └── app/uploads/
└── tests/

Frontend (mantener separado):
├── apps/web/ (Next.js - sin cambios)
```

---

## ⏱️ Estimación de Tiempo

| Fase | Tarea | Días |
|------|-------|------|
| 1 | Preparación | 1-2 |
| 2 | Migraciones BD | 2-3 |
| 3 | Lógica Negocios | 4-5 |
| 4 | Routes API | 1-2 |
| 5 | Auth & Middleware | 1-2 |
| 6 | Integraciones | 2-3 |
| 7 | Testing | 2-3 |
| 8 | Deploy & Docs | 1-2 |
| | **TOTAL** | **14-22 días** |

---

## ✅ Checklist de Migración

### Base de Datos
- [ ] 11 migraciones creadas
- [ ] Modelos Eloquent creados
- [ ] Relaciones definidas
- [ ] Seeds de datos

### Backend
- [ ] 11 controladores creados
- [ ] 5+ servicios creados
- [ ] 10+ Form Requests
- [ ] Rutas API completas
- [ ] Middleware de roles

### Funcionalidades
- [ ] Auth (register/login/logout)
- [ ] JWT Sanctum tokens
- [ ] Bookings CRUD
- [ ] Drivers management
- [ ] File uploads
- [ ] Notifications
- [ ] Push subscriptions

### Integraciones
- [ ] Firebase Admin
- [ ] Web Push
- [ ] Google Maps (frontend)

### Testing
- [ ] Unit tests
- [ ] API tests
- [ ] Integration tests

### Deployment
- [ ] CORS configurado
- [ ] Variables .env
- [ ] Conexión BD
- [ ] Storage configurado
- [ ] Queue configurado

---

## 🚀 Próximos Pasos

1. **Crear proyecto Laravel**
   ```bash
   composer create-project laravel/laravel aerotaxi-laravel "11.*"
   ```

2. **Instalar dependencias**
   ```bash
   composer require laravel/sanctum
   composer require firebase/php-jwt
   composer require minishlink/web-push
   ```

3. **Comenzar con Fase 2 (Migraciones)**

4. **Mantener Next.js frontend como está**

---

## 📝 Notas Importantes

1. **IDs**: Cambiar de Drizzle `createId()` a Laravel Ulid/Uuid
2. **Timestamps**: PostgreSQL con timezone (ya configurado)
3. **Enums**: Usar constantes o enum PHP 8.1+
4. **Password Hashing**: Usar `Hash::make()` de Laravel
5. **JWT**: Usar `Sanctum` o `firebase/php-jwt`
6. **Storage**: Usar `Storage` facade para uploads
7. **Queue**: Usar Redis para jobs (notificaciones async)
8. **Testing**: PHPUnit para tests

---

## 💡 Consideraciones Finales

- **Frontend**: Mantener Next.js (no requiere cambios)
- **Base de datos**: PostgreSQL (sin cambios)
- **API**: 100% compatible con frontend existente
- **Hosting**: Laravel funciona en todos los hosts PHP
- **Performance**: Laravel es muy robusto y performante

¿Listo para comenzar la migración?
