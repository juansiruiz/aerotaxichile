<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            
            $table->uuid('client_id');
            $table->uuid('driver_id')->nullable();
            $table->uuid('vehicle_id')->nullable();
            $table->uuid('zone_id')->nullable();
            $table->uuid('commune_route_id')->nullable();
            
            $table->enum('direction', ['to_airport', 'from_airport', 'to_destination']);
            $table->string('origin');
            $table->string('destination');
            
            $table->timestamp('scheduled_at');
            $table->integer('passenger_count')->default(1);
            $table->enum('vehicle_type', ['sedan', 'suv', 'minivan', 'van']);
            
            $table->integer('total_price');
            $table->enum('payment_method', ['online', 'cash']);
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');
            $table->string('ventipay_order_id')->nullable();
            
            $table->enum('status', ['pending', 'assigned', 'confirmed', 'rejected', 'en_route', 'completed', 'cancelled', 'settled'])->default('pending');
            $table->enum('collected_by', ['driver', 'admin'])->nullable();
            $table->boolean('admin_confirmed')->default(false);
            $table->text('admin_notes')->nullable();
            $table->text('driver_notes')->nullable();
            
            $table->timestamps();

            $table->foreign('client_id')->references('id')->on('users');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('vehicle_id')->references('id')->on('vehicles')->onDelete('set null');
            $table->foreign('zone_id')->references('id')->on('zones');
            $table->foreign('commune_route_id')->references('id')->on('commune_routes');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
