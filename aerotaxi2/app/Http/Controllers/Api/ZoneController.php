<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Zone;
use Illuminate\Http\Request;

class ZoneController extends Controller
{
    public function index()
    {
        $zones = Zone::all();
        
        $transformed = $zones->map(function ($z) {
            return [
                'id' => $z->id,
                'name' => $z->name,
                'label' => $z->label,
                'priceSedan' => $z->price_sedan,
                'priceSuv' => $z->price_suv,
                'priceMinivan' => $z->price_minivan,
                'priceVan' => $z->price_van,
                'comunas' => $z->comunas,
                'createdAt' => $z->created_at->toISOString(),
                'updatedAt' => $z->updated_at->toISOString(),
            ];
        });

        return response()->json(['data' => $transformed]);
    }
}
