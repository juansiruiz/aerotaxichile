<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommuneRoute;
use Illuminate\Http\Request;

class CommuneRouteController extends Controller
{
    public function index()
    {
        $routes = CommuneRoute::where('is_active', true)->get();
        
        $transformed = $routes->map(function ($r) {
            return [
                'id' => (string) $r->id,
                'fromCommune' => $r->from_commune,
                'toCommune' => $r->to_commune,
                'priceSedan' => $r->price_sedan,
                'priceSuv' => $r->price_suv,
                'priceMinivan' => $r->price_minivan,
                'priceVan' => $r->price_van,
                'isActive' => (bool) $r->is_active,
            ];
        });

        return response()->json(['data' => $transformed]);
    }
}
