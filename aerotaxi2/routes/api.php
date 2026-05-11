<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BookingController;
use App\Http\Controllers\Api\DriverController;
use App\Http\Controllers\Api\ZoneController;

use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CommuneRouteController;

Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);
Route::post('/auth/check-email', [AuthController::class, 'checkEmail']);
Route::get('/zones', [ZoneController::class, 'index']);
Route::get('/settings', [SettingController::class, 'index']);
Route::get('/commune-routes', [CommuneRouteController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/user', function (Request $request) {
        return $request->user();
    });

    Route::get('/bookings', [BookingController::class, 'index']);
    Route::get('/drivers', [DriverController::class, 'index']);
});
