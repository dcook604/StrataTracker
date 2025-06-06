#!/bin/bash
set -e

# ===============================================
# StrataTracker Production Migration Script
# ===============================================

# Configuration
# Use DATABASE_URL if available, otherwise fall back to individual variables
DB_URL="${DATABASE_URL:-postgres://${POSTGRES_USER:-spectrum4}:${POSTGRES_PASSWORD:-}@${DB_HOST:-localhost}:${DB_PORT:-5432}/${POSTGRES_DB:-spectrum4}}"
BACKUP_DIR="./backups"
MIGRATION_DIR="./migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are available
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    if ! command -v pg_dump &> /dev/null; then
        log_error "pg_dump is required but not installed"
        exit 1
    fi
    
    if ! command -v psql &> /dev/null; then
        log_error "psql is required but not installed"
        exit 1
    fi
    
    if [ ! -d "$MIGRATION_DIR" ]; then
        log_error "Migration directory $MIGRATION_DIR not found"
        exit 1
    fi
    
    log_success "Prerequisites check passed"
}

# Test database connection
test_connection() {
    log_info "Testing database connection..."
    
    if ! psql -d "$DB_URL" -c "SELECT 1;" &> /dev/null; then
        log_error "Cannot connect to database. Please check your DATABASE_URL or connection settings."
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Create backup
create_backup() {
    local db_name=$(echo "$DB_URL" | awk -F/ '{print $NF}')
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local backup_file="$BACKUP_DIR/${db_name}_backup_${timestamp}.sql"
    
    log_info "Creating database backup..."
    
    # Create backup directory if it doesn't exist
    mkdir -p "$BACKUP_DIR"
    
    # Create backup
    if pg_dump -d "$DB_URL" > "$backup_file"; then
        log_success "Backup created: $backup_file"
        echo "$backup_file"
    else
        log_error "Failed to create backup"
        exit 1
    fi
}

# Apply migrations
apply_migrations() {
    log_info "Applying database migrations..."
    
    # Check if migrations table exists, create if not
    psql -d "$DB_URL" -c "
        CREATE TABLE IF NOT EXISTS migration_history (
            id SERIAL PRIMARY KEY,
            filename VARCHAR(255) NOT NULL UNIQUE,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );" > /dev/null
    
    # Get list of applied migrations
    local applied_migrations=$(psql -d "$DB_URL" -t -c "SELECT filename FROM migration_history;" | tr -d ' ')
    
    # Apply each migration file
    local migration_count=0
    for migration_file in $(find "$MIGRATION_DIR" -name "*.sql" | sort); do
        if [ -f "$migration_file" ]; then
            local filename=$(basename "$migration_file")
            
            # Skip if already applied
            if echo "$applied_migrations" | grep -q "^$filename$"; then
                log_info "Skipping already applied migration: $filename"
                continue
            fi
            
            log_info "Applying migration: $filename"
            
            # Apply migration
            if psql -d "$DB_URL" -f "$migration_file"; then
                # Record successful migration
                psql -d "$DB_URL" -c "INSERT INTO migration_history (filename) VALUES ('$filename');" > /dev/null
                log_success "Applied migration: $filename"
                ((migration_count++))
            else
                log_error "Failed to apply migration: $filename"
                exit 1
            fi
        fi
    done
    
    if [ $migration_count -eq 0 ]; then
        log_info "No new migrations to apply"
    else
        log_success "Applied $migration_count new migrations"
    fi
}

# Verify database health
verify_health() {
    log_info "Verifying database health..."
    
    # Test basic queries
    if psql -d "$DB_URL" -c "
        SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
        SELECT COUNT(*) FROM users;
        SELECT COUNT(*) FROM violations;
    " > /dev/null; then
        log_success "Database health check passed"
    else
        log_error "Database health check failed"
        exit 1
    fi
}

# Main execution
main() {
    local force_mode=false
    if [[ "$1" == "--force" || "$1" == "-y" ]]; then
        force_mode=true
    fi

    log_info "Starting StrataTracker production migration..."
    
    # Confirmation prompt
    if [ "$force_mode" = false ]; then
        local db_details=$(echo "$DB_URL" | sed -E 's/postgres:\/\/[^:]+:[^@]+@/postgres:\/\/[REDACTED]:[REDACTED]@/')
        echo "Database URL: $db_details"
        read -p "Continue with migration? [y/N]: " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log_info "Migration cancelled by user"
            exit 0
        fi
    else
        log_warning "Running in non-interactive mode (--force)."
    fi

    check_prerequisites
    test_connection
    
    # Create backup
    local backup_file=$(create_backup)
    
    # Apply migrations
    apply_migrations
    
    # Verify health
    verify_health
    
    log_success "Migration completed successfully!"
    log_info "Backup file: $backup_file"
    
    # Cleanup old backups (keep last 10)
    log_info "Cleaning up old backups..."
    local db_name=$(echo "$DB_URL" | awk -F/ '{print $NF}')
    find "$BACKUP_DIR" -name "${db_name}_backup_*.sql" -type f | sort -r | tail -n +11 | xargs -r rm
    log_success "Cleanup completed"
}

# Script options
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [options]"
        echo "Options:"
        echo "  --help, -h       Show this help message"
        echo "  --backup-only    Create backup only (no migrations)"
        echo "  --verify-only    Verify database health only"
        echo "  --force, -y      Run non-interactively"
        echo ""
        echo "Environment variables:"
        echo "  DATABASE_URL     Full database connection string"
        echo "  (or POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, DB_HOST, DB_PORT)"
        exit 0
        ;;
    --backup-only)
        check_prerequisites
        test_connection
        create_backup
        exit 0
        ;;
    --verify-only)
        check_prerequisites
        test_connection
        verify_health
        exit 0
        ;;
    --force|-y)
        main "$1"
        ;;
    "")
        main
        ;;
    *)
        log_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac 