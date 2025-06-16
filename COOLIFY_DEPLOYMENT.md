# StrataTracker Coolify Deployment Guide

This guide will help you deploy StrataTracker using Coolify on your local server.

## Prerequisites

1. **Coolify installed and running** on your server
2. **Supabase project** set up for authentication
3. **SMTP credentials** for email functionality
4. **Domain or subdomain** configured (optional but recommended)

## Port Configuration

This deployment is configured for:
- **Frontend (App)**: Port 3030
- **PostgreSQL Database**: Port 5433
- Uses Coolify's built-in reverse proxy

## Quick Setup Steps

### 1. Prepare Environment Variables

Copy the environment template and configure your values:

```bash
cp coolify.env.example .env
```

Edit `.env` and update these critical values:

#### Required Variables:
- `DATABASE_URL` - Will be auto-configured by Coolify
- `POSTGRES_PASSWORD` - Strong database password
- `SESSION_SECRET` - Generate a secure 64+ character string
- `APP_URL` - Your application domain
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key

#### Email Configuration:
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`
- `EMAIL_FROM` - Your sender email address

### 2. Coolify Project Setup

1. **Create New Project** in Coolify
2. **Add Git Repository**: Point to your StrataTracker repository
3. **Set Build Pack**: Docker Compose
4. **Dockerfile**: Use `Dockerfile.coolify`
5. **Docker Compose File**: Use `docker-compose.coolify.yml`

### 3. Environment Variables in Coolify

In your Coolify project settings, add these environment variables:

```bash
# Core Settings
NODE_ENV=production
APP_URL=https://your-domain.com
PUBLIC_BASE_URL=https://your-domain.com
CORS_ORIGIN=https://your-domain.com

# Database (Coolify will auto-generate these if using built-in PostgreSQL)
POSTGRES_DB=spectrum4
POSTGRES_USER=spectrum4
POSTGRES_PASSWORD=your_secure_password

# Security
SESSION_SECRET=your_64_char_session_secret_here
TRUST_PROXY=1
SECURE_COOKIES=true

# Supabase Auth
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your_app_password
EMAIL_FROM=noreply@your-domain.com

# Optional: Disable virus scanning for simplified deployment
VIRUS_SCANNING_ENABLED=false
```

### 4. Database Setup

The application will automatically:
- Create database tables on first run
- Run migrations
- Set up initial data

### 5. Deploy

1. **Push your code** to the connected repository
2. **Trigger deployment** in Coolify
3. **Monitor logs** for any issues
4. **Access application** via your configured domain

## Post-Deployment Steps

### 1. Create Admin User

Run the admin creation script:

```bash
# SSH into your server and run:
docker exec -it <container_name> npm run add-admin
```

### 2. Verify Functionality

1. **Health Check**: Visit `/api/health`
2. **Login**: Test authentication system
3. **Email**: Test email notifications
4. **File Upload**: Test document uploads

## Troubleshooting

### Common Issues:

1. **Database Connection Failed**
   - Verify `DATABASE_URL` format
   - Check PostgreSQL container is running
   - Ensure database credentials are correct

2. **Authentication Issues**
   - Verify Supabase configuration
   - Check CORS settings match your domain
   - Ensure Supabase RLS policies are configured

3. **Email Not Working**
   - Verify SMTP credentials
   - Check spam folder
   - Test SMTP connection manually

4. **File Uploads Failing**
   - Check upload directory permissions
   - Verify virus scanning is disabled: `VIRUS_SCANNING_ENABLED=false`

### Logs and Debugging:

```bash
# View application logs
docker logs <container_name>

# View all services
docker-compose -f docker-compose.coolify.yml logs

# Check health
curl http://your-domain.com/api/health
```

## Security Considerations

1. **Use HTTPS** in production
2. **Strong passwords** for all services
3. **Firewall rules** to restrict database access
4. **Regular backups** of PostgreSQL data
5. **Environment variables** should never be committed to git

## Backup Strategy

1. **Database Backup**:
   ```bash
   docker exec <postgres_container> pg_dump -U spectrum4 spectrum4 > backup.sql
   ```

2. **File Uploads Backup**:
   ```bash
   docker cp <app_container>:/app/uploads ./uploads_backup
   ```

## Support

- Check application logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure all required services (PostgreSQL, App) are running
- Test database connectivity separately if needed

For additional help, refer to the main project documentation or create an issue in the repository.