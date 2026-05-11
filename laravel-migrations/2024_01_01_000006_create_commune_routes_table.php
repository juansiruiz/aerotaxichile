<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('commune_routes', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('origin_commune');
            $table->string('destination_commune');
            $table->decimal('price', 10, 2);
            $table->decimal('distance', 8, 2)->nullable();
            $table->integer('estimated_time')->nullable(); // en minutos
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['origin_commune', 'destination_commune']);
            $table->index('origin_commune');
            $table->index('destination_commune');
            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('commune_routes');
    }
};
