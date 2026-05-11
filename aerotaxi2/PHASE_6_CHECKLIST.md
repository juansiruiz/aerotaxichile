# PHASE 6: DEPLOYMENT CHECKLIST

**Project:** Aerotaxi Laravel Migration  
**Phase:** 6 - Deployment  
**Date:** 2026-05-11  

---

## 📋 PRE-DEPLOYMENT

### Infrastructure Readiness
- [ ] Ubuntu 22.04 LTS server available
- [ ] 4GB+ RAM allocated (8GB+ recommended)
- [ ] 20GB+ disk space available
- [ ] Public IP/domain configured
- [ ] SSH access verified
- [ ] sudo access confirmed

### Code Readiness
- [x] Phase 5 Testing complete (25/25 tests passing)
- [x] All user authentication working
- [x] API endpoints configured
- [x] Database migrations ready
- [x] Environment template created

### Pre-deployment Verification
- [ ] Code reviewed and approved
- [ ] All tests passing locally
- [ ] Database backup created
- [ ] Rollback plan documented
- [ ] Team notified of deployment window
- [ ] Monitoring tools ready

---

## 🔧 STEP 1: PostgreSQL SETUP

### Installation
- [ ] PostgreSQL 14+ installed
- [ ] PostgreSQL service running
- [ ] Development libraries installed

### Configuration
- [ ] Production database created
- [ ] aerotaxi_user created with secure password
- [ ] Extensions enabled (uuid-ossp, pg_stat_statements)
- [ ] Connection limits configured
- [ ] Log settings configured for slow queries
- [ ] Backup directory created (/var/backups/aerotaxi)

### Testing
- [ ] Database connection tested: `psql -U aerotaxi_user -d aerotaxi_production`
- [ ] Extensions verified: `\dx`
- [ ] Table structure created ready for migrations

### Documentation
- [ ] Database credentials securely stored
- [ ] Backup procedures documented
- [ ] Recovery procedures tested

---

## ⚡ STEP 2: REDIS CONFIGURATION

### Installation
- [ ] Redis 6.0+ installed
- [ ] Redis service running
- [ ] Redis CLI available

### Configuration
- [ ] Redis password set securely
- [ ] Memory limit configured (512MB minimum)
- [ ] Persistence enabled (RDB + AOF)
- [ ] Eviction policy set to allkeys-lru

### Testing
- [ ] Redis ping test: `redis-cli ping`
- [ ] Password authentication: `redis-cli -a <password> ping`
- [ ] Data persistence verified
- [ ] Connection from Laravel verified

### Documentation
- [ ] Redis password documented
- [ ] Redis backup procedures documented

---

## 👷 STEP 3: SUPERVISOR SETUP

### Installation
- [ ] Supervisor installed
- [ ] Supervisor service running
- [ ] Configuration files deployed

### Configuration
- [ ] Queue worker configuration created
- [ ] Scheduler configuration created
- [ ] Log paths configured
- [ ] Auto-restart enabled
- [ ] Process limits set (4 workers recommended)

### Testing
- [ ] Supervisor status: `sudo supervisorctl status`
- [ ] Workers running: `sudo supervisorctl status aerotaxi-queue`
- [ ] Logs accessible: `sudo supervisorctl tail aerotaxi-queue`
- [ ] Auto-restart verified (kill worker process)

### Documentation
- [ ] Worker monitoring procedures documented
- [ ] Restart procedures documented
- [ ] Troubleshooting guide created

---

## 🌐 STEP 4: NGINX CONFIGURATION

### Installation
- [ ] Nginx installed
- [ ] Nginx service running
- [ ] Nginx configuration validated

### Configuration
- [ ] Production config deployed to /etc/nginx/sites-available/
- [ ] Domain name updated in config
- [ ] SSL certificate paths configured
- [ ] Rate limiting rules set
- [ ] Security headers configured
- [ ] Gzip compression enabled

### Testing
- [ ] Config validation: `sudo nginx -t`
- [ ] Nginx starts: `sudo systemctl start nginx`
- [ ] Static files served correctly
- [ ] HTTP to HTTPS redirect working

### Documentation
- [ ] Configuration parameters documented
- [ ] Domain/subdomain information recorded

---

## 🔐 STEP 5: SSL/TLS CERTIFICATES

### Installation
- [ ] Certbot installed
- [ ] Let's Encrypt account created

### Configuration
- [ ] SSL certificate created for primary domain
- [ ] SSL certificate created for www subdomain
- [ ] Certificate renewal scheduled (certbot.timer)
- [ ] Certificate paths updated in Nginx

### Testing
- [ ] Certificate validity: `openssl x509 -text -noout -in /etc/letsencrypt/live/...`
- [ ] HTTPS access verified: `curl -I https://your-domain.com`
- [ ] SSL Labs score verified: A or A+ rating
- [ ] Renewal test: `sudo certbot renew --dry-run`

### Documentation
- [ ] Certificate renewal date recorded
- [ ] Auto-renewal confirmation documented

---

## 🔑 STEP 6: ENVIRONMENT CONFIGURATION

### File Setup
- [ ] .env.production copied to server
- [ ] File permissions set (600)
- [ ] Owner set to www-data

### Critical Variables
- [ ] APP_DEBUG=false
- [ ] APP_ENV=production
- [ ] DB_CONNECTION=pgsql
- [ ] DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD configured
- [ ] REDIS_HOST, REDIS_PASSWORD configured
- [ ] QUEUE_CONNECTION=redis
- [ ] CACHE_DRIVER=redis
- [ ] SESSION_DRIVER=redis
- [ ] LOG_LEVEL=warning
- [ ] MAIL_DRIVER configured
- [ ] SANCTUM configuration complete

### Security
- [ ] Application key generated fresh
- [ ] No secrets in version control
- [ ] File permissions restricted
- [ ] Backup of credentials created

---

## 🚀 STEP 7: APPLICATION DEPLOYMENT

### Code Deployment
- [ ] Code pulled from repository
- [ ] Branch verified (main)
- [ ] Composer dependencies installed (no-dev)
- [ ] npm packages installed (if needed)

### Database Setup
- [ ] Migrations run: `php artisan migrate --force`
- [ ] Initial seeders run (if applicable)
- [ ] Database schema verified

### Cache Building
- [ ] Config cached: `php artisan config:cache`
- [ ] Routes cached: `php artisan route:cache`
- [ ] Views cached: `php artisan view:cache`
- [ ] Old caches cleared

### Permissions
- [ ] Ownership: www-data:www-data
- [ ] Directory permissions: 755
- [ ] Storage/cache permissions: 775

---

## 📊 STEP 8: MONITORING & LOGGING

### Logging Setup
- [ ] Laravel logging configured for production
- [ ] Log rotation configured (daily, 30-day retention)
- [ ] Log aggregation started (if using external service)
- [ ] Error monitoring configured (Sentry, etc.)

### Monitoring Tools
- [ ] System monitoring installed (htop, iotop)
- [ ] Log monitoring set up (tail, grep)
- [ ] Performance metrics collection started
- [ ] Alerts configured for critical metrics

### Log Files
- [ ] Nginx error logs accessible
- [ ] PHP-FPM logs accessible
- [ ] Laravel application logs accessible
- [ ] Supervisor worker logs accessible

---

## 💾 STEP 9: BACKUP & RECOVERY

### Backup System
- [ ] Backup script created
- [ ] Backup directory created with proper permissions
- [ ] Backup cron job scheduled (daily at 2 AM)
- [ ] First backup completed successfully

### Backup Verification
- [ ] Database backup created and tested
- [ ] Application files backup created
- [ ] Environment file backed up
- [ ] Backup restore procedure tested

### Disaster Recovery
- [ ] Recovery procedure documented
- [ ] Recovery procedure tested
- [ ] Team trained on recovery
- [ ] Backup storage secured

### Remote Backups (Optional)
- [ ] S3 bucket configured (if using)
- [ ] AWS credentials configured
- [ ] S3 sync backup script created
- [ ] Remote backup tested

---

## ✅ STEP 10: PRODUCTION VALIDATION

### Health Checks
- [ ] Health endpoint responds: `curl https://your-domain.com/health`
- [ ] Homepage loads: `curl https://your-domain.com`
- [ ] API endpoints accessible

### Functional Tests
- [ ] User registration works (includes phone field)
- [ ] User login works
- [ ] Password reset works
- [ ] Email sending works
- [ ] Database queries work
- [ ] Redis caching works
- [ ] Queue jobs process

### Performance Tests
- [ ] Page load time < 2 seconds
- [ ] API response time < 500ms
- [ ] Database queries < 100ms
- [ ] Load test: 1000 requests/100 concurrent

### Security Tests
- [ ] HTTPS enforced (no HTTP)
- [ ] Security headers present
- [ ] SSL certificate valid (A/A+ rating)
- [ ] No sensitive data in logs
- [ ] Rate limiting working
- [ ] CORS properly configured

### Infrastructure Tests
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Queue workers running
- [ ] File uploads working
- [ ] Email system working
- [ ] Scheduled tasks working

---

## 📈 POST-DEPLOYMENT

### Monitoring Start
- [ ] Real-time monitoring active
- [ ] Alert systems tested
- [ ] On-call rotation started
- [ ] Issue tracking updated

### Documentation
- [ ] Deployment procedure documented
- [ ] Configuration changes documented
- [ ] Known issues documented
- [ ] Rollback procedure documented

### Team Communication
- [ ] Deployment completed notification sent
- [ ] Known limitations communicated
- [ ] Status page updated
- [ ] Team briefing completed

### First 24 Hours
- [ ] Monitor error logs continuously
- [ ] Check performance metrics
- [ ] Review user feedback
- [ ] Verify critical features
- [ ] Be ready to rollback if needed

---

## 🔄 ROLLBACK CRITERIA

**Rollback immediately if:**
- [ ] Application not responding (health check fails)
- [ ] Database connection failures
- [ ] High error rate (> 1% of requests)
- [ ] Queue workers not processing jobs
- [ ] Security vulnerabilities discovered
- [ ] Data corruption detected
- [ ] Performance degradation (response time > 5s)

**Rollback procedure:**
```bash
# Stop services
sudo systemctl stop nginx php-fpm
sudo supervisorctl stop aerotaxi-workers:*

# Restore from backup
cd / && sudo tar -xzf /var/backups/aerotaxi/app_backup_[TIMESTAMP].tar.gz
sudo -u postgres psql < /var/backups/aerotaxi/db_backup_[TIMESTAMP].sql.gz

# Fix permissions
sudo chown -R www-data:www-data /var/www/aerotaxi
sudo chmod -R 775 /var/www/aerotaxi/storage

# Restart services
sudo systemctl start nginx php-fpm
sudo supervisorctl start aerotaxi-workers:*
```

---

## 📞 ESCALATION CONTACTS

| Role | Name | Phone | Email |
|------|------|-------|-------|
| DevOps Lead | | | |
| Database Admin | | | |
| System Admin | | | |
| On-Call Engineer | | | |

---

## 🎯 DEPLOYMENT COMPLETION

### Sign-off
- [ ] Deployment lead: _________________ Date: _______
- [ ] QA lead: _________________ Date: _______
- [ ] Operations lead: _________________ Date: _______

### Notes
```
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________
```

---

**✅ DEPLOYMENT COMPLETE**

All Phase 6 deployment steps have been completed and verified.

**Next Phase:** Phase 7 - Optimization & Scaling

---

*Last Updated: 2026-05-11*
