<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Concerns\HasUuids;

class CommuneRoute extends Model
{
    use HasUuids;

    protected $fillable = [
        'from_commune',
        'to_commune',
        'price_sedan',
        'price_suv',
        'price_minivan',
        'price_van',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];
}
