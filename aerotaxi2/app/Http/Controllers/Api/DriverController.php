<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Driver;
use Illuminate\Http\Request;

class DriverController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'admin') {
            return response()->json(['error' => 'Sin acceso'], 403);
        }

        $drivers = User::where('role', 'driver')
            ->where('is_active', true)
            ->with(['driver.vehicle'])
            ->get();

        $transformed = $drivers->map(function ($u) {
            $d = $u->driver;
            $v = $d ? $d->vehicle : null;
            
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'phone' => $u->phone,
                'photoUrl' => $u->photo_url,
                'isActive' => (bool)$u->is_active,
                'createdAt' => $u->created_at->toISOString(),
                'licenseNumber' => $d ? $d->license_number : null,
                'isAvailable' => $d ? (bool)$d->is_available : false,
                'vehicleId' => $d ? $d->vehicle_id : null,
                'notes' => $d ? $d->notes : null,
                'commissionRate' => $d ? $d->commission_rate : 0,
                'vehiclePlate' => $v ? $v->plate : null,
                'vehicleBrand' => $v ? $v->brand : null,
                'vehicleModel' => $v ? $v->model : null,
                'vehicleYear' => $v ? $v->year : null,
                'vehicleType' => $v ? $v->type : null,
                'vehicleCapacity' => $v ? $v->capacity : null,
            ];
        });

        return response()->json(['data' => $transformed]);
    }

    public function me(Request $request)
    {
        $user = $request->user();
        if ($user->role !== 'driver') {
            return response()->json(['error' => 'Sin acceso'], 403);
        }

        $u = User::with(['driver.vehicle'])->find($user->id);

        $d = $u->driver;
        $v = $d ? $d->vehicle : null;

        $data = [
            'id' => $u->id,
            'name' => $u->name,
            'email' => $u->email,
            'phone' => $u->phone,
            'photoUrl' => $u->photo_url,
            'isActive' => (bool)$u->is_active,
            'licenseNumber' => $d ? $d->license_number : null,
            'isAvailable' => $d ? (bool)$d->is_available : false,
            'vehicleId' => $d ? $d->vehicle_id : null,
            'commissionRate' => $d ? $d->commission_rate : 0,
            'vehiclePlate' => $v ? $v->plate : null,
            'vehicleBrand' => $v ? $v->brand : null,
            'vehicleModel' => $v ? $v->model : null,
            'vehicleYear' => $v ? $v->year : null,
            'vehicleType' => $v ? $v->type : null,
            'vehicleCapacity' => $v ? $v->capacity : null,
        ];

        return response()->json(['data' => $data]);
    }
}
