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
        Schema::create('zones', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->enum('name', ['sur', 'central', 'nororiente', 'norte', 'rural', 'suroriente', 'poniente'])->unique();
            $table->string('label');
            $table->integer('price_sedan')->default(0);
            $table->integer('price_suv')->default(0);
            $table->integer('price_minivan')->default(0);
            $table->integer('price_van')->default(0);
            $table->json('comunas')->default(new \Illuminate\Database\Query\Expression('(JSON_ARRAY())'));
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('zones');
    }
};
