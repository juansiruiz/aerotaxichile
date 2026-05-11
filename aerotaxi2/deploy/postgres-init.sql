-- PostgreSQL Production Database Initialization
-- Execute this script as the postgres superuser to set up the production database

-- Create aerotaxi user (application user, limited privileges)
CREATE USER aerotaxi_user WITH PASSWORD 'your-secure-password-here';

-- Create aerotaxi_production database
CREATE DATABASE aerotaxi_production
  OWNER aerotaxi_user
  ENCODING 'UTF8'
  LC_COLLATE 'en_US.UTF-8'
  LC_CTYPE 'en_US.UTF-8'
  TEMPLATE template0;

-- Connect to the production database
\c aerotaxi_production

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" SCHEMA public;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" SCHEMA public;

-- Grant permissions to aerotaxi_user
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO aerotaxi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aerotaxi_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO aerotaxi_user;

-- Grant all privileges on all existing objects
GRANT USAGE ON SCHEMA public TO aerotaxi_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO aerotaxi_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO aerotaxi_user;

-- Create application-specific settings
CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(255) UNIQUE NOT NULL,
  value TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID,
  action VARCHAR(255),
  model VARCHAR(255),
  model_id VARCHAR(255),
  changes JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX audit_user_id_idx (user_id),
  INDEX audit_model_idx (model, model_id),
  INDEX audit_created_at_idx (created_at)
);

-- Create performance_logs table
CREATE TABLE IF NOT EXISTS performance_logs (
  id BIGSERIAL PRIMARY KEY,
  route VARCHAR(255),
  method VARCHAR(10),
  response_time_ms INTEGER,
  status_code INTEGER,
  user_id UUID,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX perf_route_idx (route),
  INDEX perf_created_at_idx (created_at)
);

-- Create indexes for common queries
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_created_at ON users(created_at);

-- Configure PostgreSQL for production
-- Run as superuser:
ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements,auto_explain';
ALTER SYSTEM SET pg_stat_statements.track = 'all';
ALTER SYSTEM SET auto_explain.log_min_duration = 1000; -- Log queries > 1 second
ALTER SYSTEM SET log_min_duration_statement = 1000; -- Log slow queries
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_duration = off;

-- Reload PostgreSQL configuration
-- Run: sudo systemctl reload postgresql

GRANT CONNECT ON DATABASE aerotaxi_production TO aerotaxi_user;
REVOKE CONNECT ON DATABASE postgres FROM PUBLIC;

-- Display confirmation
\echo '✅ PostgreSQL production database initialized successfully'
\echo 'Database: aerotaxi_production'
\echo 'User: aerotaxi_user'
\echo 'Next steps: Run Laravel migrations with php artisan migrate --env=production'
