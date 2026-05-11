<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('booking_status_history', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('booking_id');
            $table->string('status');
            $table->string('changed_by_user_id')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('booking_id')
                ->references('id')
                ->on('bookings')
                ->onDelete('cascade');

            $table->foreign('changed_by_user_id')
                ->references('id')
                ->on('users')
                ->onDelete('set null');

            $table->index('booking_id');
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_status_history');
    }
};
