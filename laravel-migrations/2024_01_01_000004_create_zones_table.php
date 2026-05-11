<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('zones', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('name'); // Zone enum: ZONE_1, ZONE_2, etc
            $table->decimal('base_price', 10, 2);
            $table->decimal('price_per_km', 10, 2);
            $table->decimal('price_per_minute', 10, 2);
            $table->json('geometry')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('name');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
