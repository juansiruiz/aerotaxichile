<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class Zone extends Model
{
    use HasUuids;

    protected $fillable = [
        'name',
        'label',
        'price_sedan',
        'price_suv',
        'price_minivan',
        'price_van',
        'comunas',
    ];

    protected $casts = [
        'comunas' => 'array',
    ];

    public function bookings()
    {
        return $this->hasMany(Booking::class, 'zone_id');
    }
}
