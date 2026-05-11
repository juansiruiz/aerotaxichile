#!/bin/bash

################################################################################
# Aerotaxi Laravel Production Deployment Script
#
# This script handles the complete deployment of Aerotaxi to production
# Usage: ./deploy.sh [environment] [branch]
# Example: ./deploy.sh production main
################################################################################

set -e  # Exit on any error

# Configuration
ENVIRONMENT=${1:-production}
BRANCH=${2:-main}
APP_PATH="/var/www/aerotaxi"
DEPLOY_USER="www-data"
BACKUP_PATH="/var/backups/aerotaxi"
LOG_FILE="/var/log/aerotaxi_deploy.log"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Logging Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1" | tee -a "$LOG_FILE"
}

################################################################################
# Pre-deployment Checks
################################################################################

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check if running as root or with sudo
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root or with sudo"
        exit 1
    fi

    # Check required commands
    for cmd in git php composer npm curl; do
        if ! command -v $cmd &> /dev/null; then
            log_error "$cmd is not installed"
            exit 1
        fi
    done

    # Check application path exists
    if [ ! -d "$APP_PATH" ]; then
        log_error "Application path does not exist: $APP_PATH"
        exit 1
    fi

    log_success "All prerequisites met"
}

################################################################################
# Backup Functions
################################################################################

create_backup() {
    log_info "Creating backup..."

    mkdir -p "$BACKUP_PATH"
    BACKUP_FILE="$BACKUP_PATH/backup_${TIMESTAMP}.tar.gz"

    # Backup application code (excluding node_modules, vendor, storage)
    tar --exclude='node_modules' \
        --exclude='vendor' \
        --exclude='storage' \
        --exclude='.git' \
        --exclude='.env' \
        -czf "$BACKUP_FILE" -C "$(dirname $APP_PATH)" "$(basename $APP_PATH)"

    # Backup database
    if command -v pg_dump &> /dev/null; then
        log_info "Backing up PostgreSQL database..."
        BACKUP_DB="$BACKUP_PATH/database_${TIMESTAMP}.sql.gz"
        pg_dump -U aerotaxi_user aerotaxi_production | gzip > "$BACKUP_DB"
    fi

    # Backup .env file
    if [ -f "$APP_PATH/.env" ]; then
        cp "$APP_PATH/.env" "$BACKUP_PATH/.env_${TIMESTAMP}"
        chmod 600 "$BACKUP_PATH/.env_${TIMESTAMP}"
    fi

    # Keep only last 7 backups
    find "$BACKUP_PATH" -name "backup_*.tar.gz" -mtime +7 -delete

    log_success "Backup created: $BACKUP_FILE"
}

################################################################################
# Deployment Functions
################################################################################

update_code() {
    log_info "Updating code from repository..."

    cd "$APP_PATH"

    # Stash any local changes
    git stash

    # Fetch latest changes
    git fetch origin

    # Checkout specific branch
    git checkout $BRANCH
    git pull origin $BRANCH

    log_success "Code updated to branch: $BRANCH"
}

install_dependencies() {
    log_info "Installing PHP dependencies..."

    cd "$APP_PATH"

    # Install composer dependencies (no dev)
    composer install --no-dev --optimize-autoloader --no-interaction

    log_success "PHP dependencies installed"
}

run_migrations() {
    log_info "Running database migrations..."

    cd "$APP_PATH"

    php artisan migrate --env=$ENVIRONMENT --force

    log_success "Database migrations completed"
}

clear_caches() {
    log_info "Clearing application caches..."

    cd "$APP_PATH"

    # Clear all caches
    php artisan cache:clear
    php artisan config:clear
    php artisan route:clear
    php artisan view:clear

    # Rebuild caches for production
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache

    log_success "Caches cleared and rebuilt"
}

set_permissions() {
    log_info "Setting file permissions..."

    cd "$APP_PATH"

    # Set ownership
    chown -R $DEPLOY_USER:$DEPLOY_USER .

    # Set permissions
    chmod -R 755 . 2>/dev/null || true
    chmod -R 775 storage bootstrap/cache 2>/dev/null || true
    find . -type f -name "*.sh" -exec chmod +x {} \; 2>/dev/null || true

    log_success "Permissions configured"
}

restart_services() {
    log_info "Restarting application services..."

    # Restart queue workers
    if command -v supervisorctl &> /dev/null; then
        log_info "Restarting queue workers..."
        supervisorctl restart aerotaxi-queue:* || log_warning "Could not restart queue workers"
    fi

    # Reload PHP-FPM
    if systemctl is-active --quiet php-fpm; then
        systemctl reload php-fpm
        log_success "PHP-FPM reloaded"
    fi

    # Reload Nginx
    if systemctl is-active --quiet nginx; then
        nginx -t && systemctl reload nginx
        log_success "Nginx reloaded"
    fi
}

################################################################################
# Health Checks
################################################################################

health_check() {
    log_info "Running health checks..."

    # Check if application is responding
    HEALTH_URL="https://aerotaxi.cl/health"
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

    if [ "$HTTP_CODE" = "200" ]; then
        log_success "Application health check passed"
    else
        log_warning "Application returned HTTP $HTTP_CODE on health check"
    fi

    # Check database connection
    cd "$APP_PATH"
    php artisan migrate:status > /dev/null 2>&1 && log_success "Database connection OK" || log_warning "Database connection issue"

    # Check queue workers
    if command -v supervisorctl &> /dev/null; then
        supervisorctl status aerotaxi-queue > /dev/null 2>&1 && log_success "Queue workers running" || log_warning "Queue workers may have issues"
    fi
}

################################################################################
# Rollback Function
################################################################################

rollback() {
    log_error "Deployment failed! Rolling back..."

    if [ -z "$BACKUP_FILE" ]; then
        log_error "No backup available for rollback"
        return 1
    fi

    log_info "Rolling back to $BACKUP_FILE..."

    # Stop services
    supervisorctl stop aerotaxi-queue:* 2>/dev/null || true
    systemctl stop php-fpm 2>/dev/null || true

    # Restore backup
    cd / && tar -xzf "$BACKUP_FILE"

    # Restart services
    systemctl start php-fpm 2>/dev/null || true
    supervisorctl start aerotaxi-queue:* 2>/dev/null || true

    log_success "Rollback completed"
}

################################################################################
# Main Deployment Flow
################################################################################

main() {
    log_info "Starting deployment to $ENVIRONMENT environment"
    log_info "Branch: $BRANCH | Timestamp: $TIMESTAMP"

    # Initialize log file
    mkdir -p "$(dirname $LOG_FILE)"
    echo "=== Deployment Log: $TIMESTAMP ===" > "$LOG_FILE"

    # Run deployment steps
    check_prerequisites || exit 1
    create_backup || { log_error "Backup creation failed"; exit 1; }
    update_code || { rollback; exit 1; }
    install_dependencies || { rollback; exit 1; }
    run_migrations || { rollback; exit 1; }
    clear_caches || { rollback; exit 1; }
    set_permissions || { rollback; exit 1; }
    restart_services || { rollback; exit 1; }

    # Give services time to start
    sleep 5

    health_check || log_warning "Health checks raised warnings"

    log_success "======================================"
    log_success "Deployment completed successfully!"
    log_success "======================================"
    log_info "Deployment log: $LOG_FILE"
}

# Run main function
main
