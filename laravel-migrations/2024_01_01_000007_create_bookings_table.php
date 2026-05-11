<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('client_id');
            $table->string('driver_id')->nullable();

            // Ubicaciones
            $table->string('pickup_address');
            $table->decimal('pickup_latitude', 10, 8);
            $table->decimal('pickup_longitude', 11, 8);

            $table->string('dropoff_address');
            $table->decimal('dropoff_latitude', 10, 8);
            $table->decimal('dropoff_longitude', 11, 8);

            // Status y direccion
            $table->enum('status', [
                'requested', 'accepted', 'driver_arrived',
                'in_progress', 'completed', 'cancelled'
            ])->default('requested');

            $table->enum('direction', [
                'client_to_zone', 'inter_commune'
            ])->default('client_to_zone');

            // Precios
            $table->decimal('base_price', 10, 2)->nullable();
            $table->decimal('distance_price', 10, 2)->nullable();
            $table->decimal('time_price', 10, 2)->nullable();
            $table->decimal('total_price', 10, 2)->nullable();

            // Pago
            $table->enum('payment_method', ['online', 'cash'])->default('cash');
            $table->enum('payment_status', ['pending', 'paid', 'refunded'])->default('pending');

            // Tiempos
            $table->timestamp('requested_at')->useCurrent();
            $table->timestamp('accepted_at')->nullable();
            $table->timestamp('driver_arrived_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->text('cancellation_reason')->nullable();
            $table->string('collected_by')->nullable(); // driver, admin
            $table->integer('rating')->nullable();
            $table->text('review')->nullable();

            $table->timestamps();

            // Foreign keys
            $table->foreign('client_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreign('driver_id')->references('id')->on('users')->onDelete('set null');

            // Indices
            $table->index('client_id');
            $table->index('driver_id');
            $table->index('status');
            $table->index('payment_status');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
