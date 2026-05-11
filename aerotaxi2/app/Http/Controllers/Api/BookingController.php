<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Booking;
use App\Models\BookingStatusHistory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $pageSize = $request->query('pageSize', 10);

        $query = Booking::query();

        if ($user->role === 'client') {
            $query->where('client_id', $user->id);
        } elseif ($user->role === 'driver') {
            $query->where('driver_id', $user->id);
        }

        // Para Admin, incluimos datos del cliente
        if ($user->role === 'admin') {
            $query->with('client:id,name,email,phone');
        }

        $bookings = $query->orderBy('scheduled_at', 'desc')->paginate($pageSize);

        // Transformar para que coincida con el formato esperado por el frontend de AeroTaxi
        $transformed = $bookings->getCollection()->map(function ($booking) {
            $data = $booking->toArray();
            
            // Mapear camelCase si es necesario para el frontend
            // En el frontend se usa b.scheduledAt, b.totalPrice, etc.
            // Eloquent por defecto devuelve snake_case.
            
            return [
                'id' => $booking->id,
                'clientId' => $booking->client_id,
                'clientName' => $booking->client ? $booking->client->name : null,
                'clientPhone' => $booking->client ? $booking->client->phone : null,
                'clientEmail' => $booking->client ? $booking->client->email : null,
                'driverId' => $booking->driver_id,
                'vehicleId' => $booking->vehicle_id,
                'zoneId' => $booking->zone_id,
                'direction' => $booking->direction,
                'origin' => $booking->origin,
                'destination' => $booking->destination,
                'scheduledAt' => $booking->scheduled_at->toISOString(),
                'passengerCount' => $booking->passenger_count,
                'vehicleType' => $booking->vehicle_type,
                'totalPrice' => $booking->total_price,
                'paymentMethod' => $booking->payment_method,
                'paymentStatus' => $booking->payment_status,
                'status' => $booking->status,
                'adminConfirmed' => (bool)$booking->admin_confirmed,
                'adminNotes' => $booking->admin_notes,
                'driverNotes' => $booking->driver_notes,
                'createdAt' => $booking->created_at->toISOString(),
                'updatedAt' => $booking->updated_at->toISOString(),
            ];
        });

        return response()->json(['data' => $transformed]);
    }

    public function show($id, Request $request)
    {
        $user = $request->user();
        $booking = Booking::with(['client', 'driver', 'zone', 'history'])->find($id);

        if (!$booking) {
            return response()->json(['error' => 'Reserva no encontrada'], 404);
        }

        if ($user->role === 'client' && $booking->client_id !== $user->id) {
            return response()->json(['error' => 'Sin acceso'], 403);
        }

        if ($user->role === 'driver' && $booking->driver_id !== $user->id) {
            return response()->json(['error' => 'Sin acceso'], 403);
        }

        // Transformar similar a index
        $data = [
            'id' => $booking->id,
            'clientId' => $booking->client_id,
            'clientName' => $booking->client ? $booking->client->name : null,
            'clientPhone' => $booking->client ? $booking->client->phone : null,
            'clientEmail' => $booking->client ? $booking->client->email : null,
            'driverId' => $booking->driver_id,
            'vehicleId' => $booking->vehicle_id,
            'zoneId' => $booking->zone_id,
            'direction' => $booking->direction,
            'origin' => $booking->origin,
            'destination' => $booking->destination,
            'scheduledAt' => $booking->scheduled_at->toISOString(),
            'passengerCount' => $booking->passenger_count,
            'vehicleType' => $booking->vehicle_type,
            'totalPrice' => $booking->total_price,
            'paymentMethod' => $booking->payment_method,
            'paymentStatus' => $booking->payment_status,
            'status' => $booking->status,
            'adminConfirmed' => (bool)$booking->admin_confirmed,
            'adminNotes' => $booking->admin_notes,
            'driverNotes' => $booking->driver_notes,
            'createdAt' => $booking->created_at->toISOString(),
            'updatedAt' => $booking->updated_at->toISOString(),
        ];

        return response()->json(['data' => $data]);
    }

    public function confirm($id, Request $request)
    {
        $request->validate(['adminNotes' => 'nullable|string|max:500']);
        $user = $request->user();

        $booking = Booking::findOrFail($id);
        
        $booking->update([
            'admin_confirmed' => true,
            'admin_notes' => $request->adminNotes ?? $booking->admin_notes,
        ]);

        BookingStatusHistory::create([
            'booking_id' => $id,
            'status' => $booking->status,
            'notes' => 'Reserva confirmada por administrador',
        ]);

        return response()->json(['data' => $booking]);
    }
}
