# PHASE 6: DEPLOYMENT - COMPLETE GUIDE

**Project:** Aerotaxi - Node.js to Laravel Migration  
**Phase:** 6 (Deployment)  
**Status:** IN PROGRESS  
**Date Started:** 2026-05-11  
**Target Completion:** 2026-05-25

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Pre-deployment Checklist](#pre-deployment-checklist)
4. [Step 1: PostgreSQL Setup](#step-1-postgresql-setup)
5. [Step 2: Redis Configuration](#step-2-redis-configuration)
6. [Step 3: Supervisor Setup](#step-3-supervisor-setup)
7. [Step 4: Nginx Configuration](#step-4-nginx-configuration)
8. [Step 5: SSL/TLS Certificates](#step-5-ssltls-certificates)
9. [Step 6: Environment Configuration](#step-6-environment-configuration)
10. [Step 7: Application Deployment](#step-7-application-deployment)
11. [Step 8: Monitoring & Logging](#step-8-monitoring--logging)
12. [Step 9: Backup & Recovery](#step-9-backup--recovery)
13. [Step 10: Production Validation](#step-10-production-validation)

---

## Overview

Phase 6 deploys the Laravel application to a production environment with:
- **Database:** PostgreSQL with automated backups
- **Caching:** Redis for sessions, caches, and queues
- **Queue Processing:** Supervisor-managed workers
- **Web Server:** Nginx with SSL/TLS
- **Monitoring:** Structured logging and performance metrics
- **High Availability:** Load balancing, failover, and disaster recovery

### Target Infrastructure

```
┌─────────────────────────────────────────────────────────────┐
│                    Load Balancer (HA)                       │
└──────┬──────────────────────────────────────────────────┬───┘
       │                                                    │
   ┌───▼─────┐                                         ┌───▼─────┐
   │ Server 1│                                         │ Server 2│
   │ Nginx   │                                         │ Nginx   │
   │ PHP-FPM │                                         │ PHP-FPM │
   └──┬──────┘                                         └──┬──────┘
      │                                                   │
      └───────────────────┬───────────────────────────────┘
                          │
      ┌───────────────────┼───────────────────┐
      │                   │                   │
   ┌──▼────┐         ┌───▼────┐         ┌───▼────┐
   │ Redis │         │ PostgreSQL       │Supervisor
   │Cluster│         │ Cluster          │ Workers
   │       │         │                  │
   └───────┘         └────────┘         └────────┘
```

---

## Architecture

### Service Architecture

**1. Web Tier (Nginx)**
- Load balancing across application servers
- SSL/TLS termination
- Static asset caching and compression
- Rate limiting and DDoS protection

**2. Application Tier (PHP-FPM)**
- Multi-process PHP FastCGI Process Manager
- Request processing and business logic
- API endpoint handling
- Session management

**3. Cache Layer (Redis)**
- Session storage
- Application cache
- Queue management
- Real-time data

**4. Database Tier (PostgreSQL)**
- Persistent data storage
- ACID compliance
- Point-in-time recovery
- Connection pooling via pgBouncer

**5. Queue Processing (Supervisor)**
- Asynchronous job processing
- Email notifications
- Push notifications
- Scheduled tasks

---

## Pre-deployment Checklist

### Phase 5 Verification
- [x] All 25 tests passing
- [x] User authentication working
- [x] Database schema validated
- [x] API endpoints ready

### Infrastructure Requirements
- [ ] Ubuntu 22.04 LTS or newer
- [ ] Minimum 4GB RAM (8GB+ recommended)
- [ ] Minimum 20GB disk space
- [ ] sudo access required
- [ ] Public IP address or domain
- [ ] SSL certificate (Let's Encrypt compatible)

### Knowledge Requirements
- [ ] Linux/Ubuntu command line
- [ ] PostgreSQL basics
- [ ] Redis basics
- [ ] Nginx basics
- [ ] PHP/Laravel basics

### Required Tools
- [ ] SSH access to server
- [ ] Terminal/CLI access
- [ ] Git installed
- [ ] PHP 8.2+ installed
- [ ] Composer installed
- [ ] PostgreSQL 14+ installed
- [ ] Redis 6.0+ installed

---

## Step 1: PostgreSQL Setup

### 1.1 Install PostgreSQL

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install PostgreSQL and development libraries
sudo apt install -y postgresql postgresql-contrib libpq-dev

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Verify installation
sudo -u postgres psql --version
```

### 1.2 Create Production Database

```bash
# Connect to PostgreSQL as superuser
sudo -u postgres psql

# Execute the init script (from deploy/postgres-init.sql)
# Copy the SQL commands from postgres-init.sql and execute them
```

Or use the provided script:

```bash
sudo -u postgres psql < deploy/postgres-init.sql
```

### 1.3 Configure PostgreSQL

```bash
# Edit PostgreSQL configuration
sudo nano /etc/postgresql/14/main/postgresql.conf

# Key settings for production:
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 32MB
maintenance_work_mem = 64MB
random_page_cost = 1.1  # For SSD
log_min_duration_statement = 1000  # Log queries > 1 second
```

### 1.4 Configure HBA (Host-based Authentication)

```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Add line for application connection:
# host    aerotaxi_production    aerotaxi_user    127.0.0.1/32    md5
```

### 1.5 Restart PostgreSQL

```bash
sudo systemctl restart postgresql
```

### 1.6 Test Connection

```bash
psql -U aerotaxi_user -d aerotaxi_production -h 127.0.0.1 -c "SELECT version();"
```

---

## Step 2: Redis Configuration

### 2.1 Install Redis

```bash
# Install Redis server
sudo apt install -y redis-server

# Start Redis service
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify installation
redis-cli --version
redis-cli ping
```

### 2.2 Configure Redis

```bash
# Edit Redis configuration
sudo nano /etc/redis/redis.conf

# Key settings for production:
# bind 127.0.0.1 (keep default)
# requirepass your-secure-redis-password
# maxmemory 512mb
# maxmemory-policy allkeys-lru
# appendonly yes (enable persistence)
# appendfsync everysec
```

### 2.3 Set Redis Password

```bash
# Generate strong password
openssl rand -base64 32

# Update .env.production with the password
# REDIS_PASSWORD=<generated-password>
```

### 2.4 Test Redis Connection

```bash
redis-cli ping
redis-cli ping
```

### 2.5 Configure Redis Persistence

```bash
# Enable RDB snapshots
# In /etc/redis/redis.conf:
# save 900 1        # Save after 900 sec if 1+ keys changed
# save 300 10       # Save after 300 sec if 10+ keys changed
# save 60 10000     # Save after 60 sec if 10000+ keys changed

# Enable AOF for data durability
# appendonly yes
# appendfsync everysec

sudo systemctl restart redis-server
```

---

## Step 3: Supervisor Setup

### 3.1 Install Supervisor

```bash
# Install Supervisor
sudo apt install -y supervisor

# Start Supervisor
sudo systemctl start supervisor
sudo systemctl enable supervisor
```

### 3.2 Create Queue Worker Configuration

```bash
# Copy provided configuration
sudo cp deploy/aerotaxi-queue-supervisor.conf /etc/supervisor/conf.d/

# Update paths in configuration
sudo nano /etc/supervisor/conf.d/aerotaxi-queue-supervisor.conf
```

### 3.3 Register and Start Workers

```bash
# Reread configuration
sudo supervisorctl reread

# Update processes
sudo supervisorctl update

# Start all workers
sudo supervisorctl start aerotaxi-workers:*

# Check status
sudo supervisorctl status
```

### 3.4 Monitor Worker Processes

```bash
# View worker logs
sudo supervisorctl tail aerotaxi-queue stdout

# Restart specific worker
sudo supervisorctl restart aerotaxi-queue:01

# Restart all workers
sudo supervisorctl restart aerotaxi-workers:*
```

---

## Step 4: Nginx Configuration

### 4.1 Install Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Start Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify installation
sudo nginx -v
```

### 4.2 Create Application Configuration

```bash
# Copy provided configuration
sudo cp deploy/nginx-aerotaxi.conf /etc/nginx/sites-available/aerotaxi

# Update domain names in configuration
sudo nano /etc/nginx/sites-available/aerotaxi
# Replace aerotaxi.cl with your actual domain
```

### 4.3 Enable Site Configuration

```bash
# Create symlink to enable site
sudo ln -s /etc/nginx/sites-available/aerotaxi /etc/nginx/sites-enabled/

# Disable default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 4.4 Configure PHP-FPM

```bash
# Edit PHP-FPM configuration
sudo nano /etc/php/8.2/fpm/pool.d/www.conf

# Key settings:
# pm = dynamic
# pm.max_children = 50
# pm.start_servers = 10
# pm.min_spare_servers = 5
# pm.max_spare_servers = 10
# pm.max_requests = 1000

# Restart PHP-FPM
sudo systemctl restart php8.2-fpm
```

---

## Step 5: SSL/TLS Certificates

### 5.1 Install Certbot

```bash
# Install Certbot for Let's Encrypt
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
certbot --version
```

### 5.2 Create Certificates

```bash
# Create SSL certificate for your domain
sudo certbot certonly --nginx \
  -d aerotaxi.cl \
  -d www.aerotaxi.cl \
  --non-interactive \
  --agree-tos \
  --email admin@aerotaxi.cl

# Verify certificate
sudo certbot certificates
```

### 5.3 Configure Auto-renewal

```bash
# Enable certbot timer for auto-renewal
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer

# Test renewal (dry-run)
sudo certbot renew --dry-run

# Manual renewal when needed
sudo certbot renew
```

### 5.4 Update Nginx Configuration

```bash
# Update certificate paths in Nginx config
sudo nano /etc/nginx/sites-available/aerotaxi

# Update these lines:
# ssl_certificate /etc/letsencrypt/live/aerotaxi.cl/fullchain.pem;
# ssl_certificate_key /etc/letsencrypt/live/aerotaxi.cl/privkey.pem;

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## Step 6: Environment Configuration

### 6.1 Prepare Environment File

```bash
# Copy production environment template
sudo cp .env.production /var/www/aerotaxi/.env

# Set correct permissions
sudo chown www-data:www-data /var/www/aerotaxi/.env
sudo chmod 600 /var/www/aerotaxi/.env
```

### 6.2 Generate Application Key

```bash
# Generate fresh application key for production
cd /var/www/aerotaxi
sudo -u www-data php artisan key:generate --env=production
```

### 6.3 Configure Critical Environment Variables

```bash
# Edit environment file
sudo nano /var/www/aerotaxi/.env

# Set/verify these critical variables:
APP_DEBUG=false
APP_ENV=production
QUEUE_CONNECTION=redis
CACHE_DRIVER=redis
SESSION_DRIVER=redis
LOG_LEVEL=warning

# Set database credentials
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_DATABASE=aerotaxi_production
DB_USERNAME=aerotaxi_user
DB_PASSWORD=<secure-password>

# Set Redis credentials
REDIS_HOST=127.0.0.1
REDIS_PASSWORD=<secure-password>
REDIS_PORT=6379

# Set mail configuration
MAIL_DRIVER=smtp
MAIL_HOST=smtp.mailtrap.io
MAIL_PORT=2525
MAIL_USERNAME=<mailtrap-username>
MAIL_PASSWORD=<mailtrap-password>
```

### 6.4 Set Secure Permissions

```bash
# Restrict access to environment file
sudo chmod 600 /var/www/aerotaxi/.env

# Restrict access to storage directory
sudo chmod -R 775 /var/www/aerotaxi/storage
sudo chmod -R 775 /var/www/aerotaxi/bootstrap/cache

# Set correct ownership
sudo chown -R www-data:www-data /var/www/aerotaxi
```

---

## Step 7: Application Deployment

### 7.1 Application Installation

```bash
# Navigate to application directory
cd /var/www/aerotaxi

# Update from repository
sudo -u www-data git pull origin main

# Install dependencies
sudo -u www-data composer install --no-dev --optimize-autoloader

# Verify installation
composer dump-autoload
```

### 7.2 Run Migrations

```bash
# Run database migrations
sudo -u www-data php artisan migrate --env=production --force

# Seed initial data (if needed)
sudo -u www-data php artisan db:seed --env=production
```

### 7.3 Cache Configuration

```bash
# Clear all caches
sudo -u www-data php artisan cache:clear
sudo -u www-data php artisan config:clear
sudo -u www-data php artisan route:clear
sudo -u www-data php artisan view:clear

# Build caches for production
sudo -u www-data php artisan config:cache
sudo -u www-data php artisan route:cache
sudo -u www-data php artisan view:cache
```

### 7.4 Automated Deployment (Optional)

```bash
# Use provided deployment script
sudo chmod +x deploy/deploy.sh

# Run deployment
sudo ./deploy/deploy.sh production main
```

---

## Step 8: Monitoring & Logging

### 8.1 Configure Application Logging

```bash
# Update logging configuration
sudo nano /var/www/aerotaxi/config/logging.php

# Key settings for production:
# 'default' => 'stack'
# 'channels' => [
#     'stack' => 'daily',
#     'single' => 'errorlog',
#     'syslog' => 'syslog',
# ]
```

### 8.2 Setup Log Rotation

```bash
# Create logrotate configuration
sudo cat > /etc/logrotate.d/aerotaxi << 'EOF'
/var/www/aerotaxi/storage/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        /bin/kill -SIGUSR1 $(cat /var/run/syslog.pid 2>/dev/null) 2>/dev/null || true
    endscript
}
EOF
```

### 8.3 Install Monitoring Tools

```bash
# Install system monitoring tools
sudo apt install -y htop iotop nethogs

# Monitor system resources
htop

# Monitor I/O performance
iotop

# Monitor network connections
nethogs
```

### 8.4 Configure Sentry (Optional)

```bash
# Install Sentry error tracking
# 1. Sign up at https://sentry.io
# 2. Create new Laravel project
# 3. Get DSN from project settings
# 4. Update .env with Sentry DSN:
# SENTRY_LARAVEL_DSN=https://key@sentry.io/project-id

# Install Sentry SDK
composer require sentry/sentry-laravel

# Publish Sentry configuration
php artisan sentry:publish
```

### 8.5 Performance Monitoring

```bash
# Install Laravel Telescope (for development insights)
# composer require laravel/telescope --dev
# php artisan telescope:install

# In production, use external APM:
# - New Relic
# - DataDog
# - Scout APM
# - Elastic APM

# Enable slow query logging in PostgreSQL
# (Already configured in Step 1.3)

# Monitor PHP-FPM performance
sudo tail -f /var/log/php-fpm/www.log | grep 'slow'
```

---

## Step 9: Backup & Recovery

### 9.1 Automated Database Backups

```bash
# Create backup script
sudo cat > /usr/local/bin/backup-aerotaxi.sh << 'EOFBK'
#!/bin/bash
BACKUP_DIR="/var/backups/aerotaxi"
DATE=$(date +"%Y-%m-%d_%H-%M-%S")

mkdir -p "$BACKUP_DIR"

# PostgreSQL backup
pg_dump -U aerotaxi_user aerotaxi_production | \
  gzip > "$BACKUP_DIR/db_backup_$DATE.sql.gz"

# Application files backup
tar --exclude='node_modules' --exclude='vendor' --exclude='storage/logs' \
  -czf "$BACKUP_DIR/app_backup_$DATE.tar.gz" \
  -C /var/www aerotaxi

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -mtime +30 -delete

echo "Backup completed: $DATE" >> /var/log/aerotaxi-backup.log
EOFBK

# Make executable
sudo chmod +x /usr/local/bin/backup-aerotaxi.sh
```

### 9.2 Schedule Automated Backups

```bash
# Add to crontab for daily 2 AM backups
sudo crontab -e

# Add this line:
# 0 2 * * * /usr/local/bin/backup-aerotaxi.sh

# For hourly backups (optional)
# 0 * * * * /usr/local/bin/backup-aerotaxi.sh
```

### 9.3 Remote Backup Storage

```bash
# Backup to AWS S3 (example)
# Install AWS CLI
sudo apt install -y awscli

# Configure AWS credentials
aws configure

# Add S3 backup to backup script
# aws s3 sync /var/backups/aerotaxi s3://your-bucket/aerotaxi/
```

### 9.4 Disaster Recovery Procedure

```bash
# If disaster strikes, follow this procedure:

# 1. Stop application
sudo systemctl stop nginx php8.2-fpm

# 2. Restore database
gunzip -c /var/backups/aerotaxi/db_backup_*.sql.gz | \
  psql -U aerotaxi_user aerotaxi_production

# 3. Restore application files
cd / && tar -xzf /var/backups/aerotaxi/app_backup_*.tar.gz

# 4. Fix permissions
sudo chown -R www-data:www-data /var/www/aerotaxi

# 5. Run migrations if needed
cd /var/www/aerotaxi && php artisan migrate --force

# 6. Clear caches
php artisan cache:clear && php artisan config:cache

# 7. Restart services
sudo systemctl start nginx php8.2-fpm
sudo supervisorctl start aerotaxi-workers:*
```

---

## Step 10: Production Validation

### 10.1 Health Check Endpoint

```bash
# Test health check
curl -v https://aerotaxi.cl/health

# Expected output:
# HTTP/2 200
# healthy
```

### 10.2 API Endpoint Testing

```bash
# Test API availability
curl -X GET https://aerotaxi.cl/api/health

# Test authentication endpoint
curl -X POST https://aerotaxi.cl/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password"
  }'
```

### 10.3 Database Connection Test

```bash
# SSH into server
# cd /var/www/aerotaxi

# Test database
php artisan tinker
# In Tinker:
# DB::connection()->getPdo();
# exit
```

### 10.4 Redis Connection Test

```bash
# Test Redis
redis-cli ping
# Should output: PONG

# Test from Laravel
php artisan tinker
# In Tinker:
# cache()->put('test', 'value', 60);
# cache()->get('test');
# exit
```

### 10.5 Queue Processing Test

```bash
# Check queue worker status
sudo supervisorctl status aerotaxi-queue

# Monitor queue
# SSH into server and run:
php artisan queue:monitor

# Test job dispatch
php artisan tinker
# In Tinker:
# dispatch(new App\Jobs\TestJob());
# exit
```

### 10.6 SSL Certificate Validation

```bash
# Verify SSL certificate
openssl s_client -connect aerotaxi.cl:443 -showcerts

# Check certificate expiration
curl -vI https://aerotaxi.cl

# Validate with SSL Labs
# https://www.ssllabs.com/ssltest/analyze.html?d=aerotaxi.cl
```

### 10.7 Performance Testing

```bash
# Basic load testing
ab -n 1000 -c 10 https://aerotaxi.cl/

# More detailed load testing with ApacheBench
# ab -n 1000 -c 50 -p data.json https://aerotaxi.cl/api/endpoint

# Using wrk for better testing
# wrk -t4 -c100 -d30s https://aerotaxi.cl/
```

### 10.8 Security Validation

```bash
# Check security headers
curl -I https://aerotaxi.cl

# Headers to verify:
# Strict-Transport-Security
# X-Frame-Options
# X-Content-Type-Options
# X-XSS-Protection
# Referrer-Policy
```

---

## 📊 Post-Deployment Monitoring

### Daily Checks
- [ ] Application availability (ping health endpoint)
- [ ] Error log review
- [ ] Queue worker status
- [ ] Disk space usage
- [ ] Database size

### Weekly Checks
- [ ] Performance metrics review
- [ ] Security update availability
- [ ] Backup verification
- [ ] User feedback and issues

### Monthly Tasks
- [ ] SSL certificate renewal check
- [ ] Database optimization (VACUUM, ANALYZE)
- [ ] Log file cleanup
- [ ] Disaster recovery drill
- [ ] Security audit

---

## 🚨 Troubleshooting

### Application Not Responding

```bash
# Check Nginx
sudo systemctl status nginx
sudo tail -f /var/log/nginx/aerotaxi_error.log

# Check PHP-FPM
sudo systemctl status php8.2-fpm
sudo tail -f /var/log/php-fpm/www.log

# Check Laravel logs
tail -f /var/www/aerotaxi/storage/logs/laravel.log
```

### Database Connection Issues

```bash
# Test database connection
psql -U aerotaxi_user -d aerotaxi_production -c "SELECT 1;"

# Check PostgreSQL status
sudo systemctl status postgresql

# Verify credentials in .env
grep DB_ /var/www/aerotaxi/.env
```

### Queue Workers Not Processing

```bash
# Check Supervisor status
sudo supervisorctl status aerotaxi-queue

# View worker logs
sudo supervisorctl tail aerotaxi-queue

# Restart workers
sudo supervisorctl restart aerotaxi-queue:*

# Check Redis connection
redis-cli ping
```

### Redis Connection Issues

```bash
# Test Redis
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Verify credentials
grep REDIS /var/www/aerotaxi/.env

# Test from Laravel
redis-cli -h 127.0.0.1 -a <password> ping
```

---

## 📞 Support & Escalation

### Emergency Procedures

**If application is down:**
1. Check health endpoint: `curl https://aerotaxi.cl/health`
2. Review nginx error logs
3. Check PHP-FPM status
4. Restart services: `sudo systemctl restart nginx`
5. If not recovered, proceed to rollback

**If database is down:**
1. Check PostgreSQL status
2. Review database logs
3. Verify disk space
4. Attempt restart: `sudo systemctl restart postgresql`

**If services won't start:**
1. Check system resources (disk, memory)
2. Review service logs
3. Check for missing dependencies
4. Consider rollback to last known good state

---

## 📝 Summary

Phase 6 Deployment creates a production-ready Aerotaxi application with:

✅ **Infrastructure:**
- PostgreSQL database with automated backups
- Redis caching and queue management
- Supervisor queue workers
- Nginx web server with SSL/TLS
- Comprehensive logging and monitoring

✅ **Security:**
- HTTPS/SSL encryption
- Security headers configured
- Rate limiting in place
- Backup procedures established

✅ **Reliability:**
- Automated backups (daily)
- Queue worker auto-restart
- Health monitoring
- Disaster recovery procedures

✅ **Performance:**
- Redis caching enabled
- Nginx compression
- Database optimization
- Log rotation

---

## 🎯 Next Steps

After successful Phase 6 deployment:

1. **Phase 7: Optimization** - Performance tuning and optimization
2. **Phase 8: Scaling** - Add load balancing and horizontal scaling
3. **Phase 9: Advanced Features** - Real-time updates, analytics, etc.
4. **Phase 10: Maintenance** - Long-term support and operations

---

**Deployment completed successfully! 🚀**
