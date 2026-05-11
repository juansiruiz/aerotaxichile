<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Booking extends Model
{
    use HasUuids;

    protected $fillable = [
        'client_id',
        'driver_id',
        'vehicle_id',
        'zone_id',
        'commune_route_id',
        'direction',
        'origin',
        'destination',
        'scheduled_at',
        'passenger_count',
        'vehicle_type',
        'total_price',
        'payment_method',
        'payment_status',
        'ventipay_order_id',
        'status',
        'collected_by',
        'admin_confirmed',
        'admin_notes',
        'driver_notes',
    ];

    protected $casts = [
        'scheduled_at' => 'datetime',
        'admin_confirmed' => 'boolean',
    ];

    public function client()
    {
        return $this->belongsTo(User::class, 'client_id');
    }

    public function driver()
    {
        return $this->belongsTo(Driver::class, 'driver_id');
    }

    public function zone()
    {
        return $this->belongsTo(Zone::class, 'zone_id');
    }

    public function communeRoute()
    {
        return $this->belongsTo(CommuneRoute::class, 'commune_route_id');
    }

    public function history()
    {
        return $this->hasMany(BookingStatusHistory::class, 'booking_id');
    }
}
