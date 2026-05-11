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
        Schema::create('booking_status_histories', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('booking_id');
            $table->enum('from_status', ['pending', 'assigned', 'confirmed', 'rejected', 'en_route', 'completed', 'cancelled', 'settled'])->nullable();
            $table->enum('to_status', ['pending', 'assigned', 'confirmed', 'rejected', 'en_route', 'completed', 'cancelled', 'settled']);
            $table->uuid('changed_by_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
            
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('changed_by_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('booking_status_histories');
    }
};
