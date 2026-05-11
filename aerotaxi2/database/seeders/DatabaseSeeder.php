<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Driver;
use App\Models\Vehicle;
use App\Models\Zone;
use App\Models\Booking;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // ── Zonas ─────────────────────────────────────────────────────────────────
        $zonesData = [
            ['name' => 'central',    'label' => 'Zona Central',    'price_sedan' => 18000, 'price_suv' => 24000, 'price_minivan' => 30000, 'price_van' => 42000, 'comunas' => ['Santiago', 'Providencia', 'Ñuñoa', 'Estación Central']],
            ['name' => 'sur',        'label' => 'Zona Sur',        'price_sedan' => 22000, 'price_suv' => 28000, 'price_minivan' => 35000, 'price_van' => 48000, 'comunas' => ['San Miguel', 'La Cisterna', 'San Joaquín', 'La Granja']],
            ['name' => 'norte',      'label' => 'Zona Norte',      'price_sedan' => 25000, 'price_suv' => 32000, 'price_minivan' => 40000, 'price_van' => 55000, 'comunas' => ['Recolotea', 'Independencia', 'Conchalí', 'Quilicura']],
            ['name' => 'nororiente', 'label' => 'Zona Nororiente', 'price_sedan' => 28000, 'price_suv' => 36000, 'price_minivan' => 45000, 'price_van' => 60000, 'comunas' => ['Las Condes', 'Vitacura', 'Lo Barnechea']],
            ['name' => 'suroriente', 'label' => 'Zona Suroriente', 'price_sedan' => 26000, 'price_suv' => 33000, 'price_minivan' => 42000, 'price_van' => 56000, 'comunas' => ['Peñalolén', 'La Florida', 'La Reina', 'Macul']],
            ['name' => 'poniente',   'label' => 'Zona Poniente',   'price_sedan' => 20000, 'price_suv' => 26000, 'price_minivan' => 32000, 'price_van' => 45000, 'comunas' => ['Maipú', 'Pudahuel', 'Lo Prado', 'Quinta Normal']],
            ['name' => 'rural',      'label' => 'Zona Rural',      'price_sedan' => 35000, 'price_suv' => 45000, 'price_minivan' => 55000, 'price_van' => 72000, 'comunas' => ['Colina', 'Lampa', 'Talagante', 'Melipilla']],
        ];

        foreach ($zonesData as $z) {
            Zone::updateOrCreate(['name' => $z['name']], $z);
        }

        $allZones = Zone::all()->keyBy('name');

        // ── Admin ─────────────────────────────────────────────────────────────────
        User::updateOrCreate(
            ['email' => 'admin@aerotaxichile.cl'],
            [
                'name' => 'Admin AeroTaxi',
                'phone' => '+56912345678',
                'password' => Hash::make('aerotaxi2024'),
                'role' => 'admin',
                'is_active' => true,
            ]
        );

        // ── Conductores ───────────────────────────────────────────────────────────
        $driversInput = [
            ['name' => 'Carlos Muñoz Reyes',    'email' => 'carlos@aerotaxichile.cl',  'phone' => '+56922222222', 'license' => 'B-12345678'],
            ['name' => 'Roberto Silva Lagos',   'email' => 'roberto@aerotaxichile.cl', 'phone' => '+56933333333', 'license' => 'B-87654321'],
            ['name' => 'Juan Pérez Soto',       'email' => 'juan@aerotaxichile.cl',    'phone' => '+56944444444', 'license' => 'B-11223344'],
        ];

        $driverModels = [];
        foreach ($driversInput as $d) {
            $user = User::updateOrCreate(
                ['email' => $d['email']],
                [
                    'name' => $d['name'],
                    'phone' => $d['phone'],
                    'password' => Hash::make('chofer2024'),
                    'role' => 'driver',
                    'is_active' => true,
                ]
            );

            $driver = Driver::updateOrCreate(
                ['id' => $user->id],
                ['license_number' => $d['license'], 'is_available' => true]
            );
            $driverModels[] = $driver;
        }

        // ── Vehículos ─────────────────────────────────────────────────────────────
        $vehiclesInput = [
            ['plate' => 'BBJK12', 'brand' => 'Toyota',   'model' => 'Camry',          'year' => 2023, 'type' => 'sedan',   'capacity' => 4, 'driverIdx' => 0],
            ['plate' => 'CCMN34', 'brand' => 'Toyota',   'model' => 'Fortuner',       'year' => 2022, 'type' => 'suv',     'capacity' => 7, 'driverIdx' => 1],
            ['plate' => 'DDQR56', 'brand' => 'Kia',      'model' => 'Grand Carnival', 'year' => 2023, 'type' => 'minivan', 'capacity' => 8, 'driverIdx' => 2],
        ];

        foreach ($vehiclesInput as $v) {
            $driver = $driverModels[$v['driverIdx']] ?? null;
            $vehicle = Vehicle::updateOrCreate(
                ['plate' => $v['plate']],
                [
                    'brand' => $v['brand'],
                    'model' => $v['model'],
                    'year' => $v['year'],
                    'type' => $v['type'],
                    'capacity' => $v['capacity'],
                    'driver_id' => $driver ? $driver->id : null,
                ]
            );
            if ($driver) {
                $driver->update(['vehicle_id' => $vehicle->id]);
            }
        }

        // ── Clientes ──────────────────────────────────────────────────────────────
        $clientsInput = [
            ['name' => 'María González Vidal',    'email' => 'maria@gmail.com',  'phone' => '+56955555555'],
            ['name' => 'Pedro Rodríguez Torres',  'email' => 'pedro@gmail.com',  'phone' => '+56966666666'],
        ];

        $clientIds = [];
        foreach ($clientsInput as $cl) {
            $user = User::updateOrCreate(
                ['email' => $cl['email']],
                [
                    'name' => $cl['name'],
                    'phone' => $cl['phone'],
                    'password' => Hash::make('cliente2024'),
                    'role' => 'client',
                    'is_active' => true,
                ]
            );
            $clientIds[] = $user->id;
        }

        // ── Reservas ──────────────────────────────────────────────────────────────
        $zC = $allZones['central'] ?? null;
        $zN = $allZones['norte'] ?? null;
        $zSO = $allZones['suroriente'] ?? null;

        if ($zC && $zN && $zSO && count($clientIds) >= 2) {
            $bookingsInput = [
                [
                    'client_id' => $clientIds[0],
                    'zone_id' => $zC->id,
                    'direction' => 'to_airport',
                    'origin' => 'Av. Providencia 1234, Providencia',
                    'destination' => 'Aeropuerto AMB, Pudahuel',
                    'scheduled_at' => now()->addDays(1)->setHour(8)->setMinute(0),
                    'passenger_count' => 2,
                    'vehicle_type' => 'sedan',
                    'total_price' => $zC->price_sedan,
                    'payment_method' => 'cash',
                    'status' => 'pending',
                ],
                [
                    'client_id' => $clientIds[1],
                    'zone_id' => $zN->id,
                    'direction' => 'from_airport',
                    'origin' => 'Aeropuerto AMB, Pudahuel',
                    'destination' => 'Av. Las Condes 8500, Las Condes',
                    'scheduled_at' => now()->addDays(2)->setHour(14)->setMinute(30),
                    'passenger_count' => 4,
                    'vehicle_type' => 'suv',
                    'total_price' => $zN->price_suv,
                    'payment_method' => 'online',
                    'status' => 'pending',
                ],
                [
                    'client_id' => $clientIds[0],
                    'zone_id' => $zSO->id,
                    'direction' => 'to_airport',
                    'origin' => 'Av. Vicuña Mackenna 3000, Macul',
                    'destination' => 'Aeropuerto AMB, Pudahuel',
                    'scheduled_at' => now()->addDays(3)->setHour(5)->setMinute(15),
                    'passenger_count' => 6,
                    'vehicle_type' => 'minivan',
                    'total_price' => $zSO->price_minivan,
                    'payment_method' => 'cash',
                    'status' => 'pending',
                ],
            ];

            foreach ($bookingsInput as $b) {
                Booking::create($b);
            }
        }
    }
}
