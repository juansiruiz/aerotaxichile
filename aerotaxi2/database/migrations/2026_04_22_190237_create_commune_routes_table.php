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
        Schema::create('commune_routes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('from_commune');
            $table->string('to_commune');
            $table->integer('price_sedan')->default(0);
            $table->integer('price_suv')->default(0);
            $table->integer('price_minivan')->default(0);
            $table->integer('price_van')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('commune_routes');
    }
};
