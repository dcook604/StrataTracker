# StrataTracker Database Architecture

## 🏗️ Overview

StrataTracker uses a **HYBRID DATABASE ARCHITECTURE** that separates authentication from application data for security, scalability, and maintainability.

## 📡 Supabase - Authentication ONLY

**Purpose**: User authentication and session management

### What Supabase Handles:
- ✅ User login/logout flows
- ✅ JWT token generation and validation
- ✅ Password resets and email verification
- ✅ Session management
- ✅ Authentication state for frontend

### What's Stored in Supabase:
- `auth.users` table with basic user info (id, email, created_at)
- Authentication metadata and session tokens
- **NO application-specific data**
- **NO user roles or business logic**

### Connection Details:
```env
SUPABASE_URL=https://bmtydjmymvvsqudonfiz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...
```

## 🗄️ PostgreSQL - ALL Application Data

**Purpose**: Complete business logic and application data storage

### What PostgreSQL Handles:
- ✅ User profiles with roles (admin/council/user)
- ✅ All business entities (violations, units, categories, etc.)
- ✅ Application settings and configuration
- ✅ Email deduplication and tracking
- ✅ Audit logs and system data

### Critical Tables:
```sql
-- User roles and profile data (THE SOURCE OF TRUTH for permissions)
profiles (id, full_name, role, updated_at)

-- All business data
violations, property_units, persons, etc.
```

### Connection Details:
```env
DATABASE_URL=postgres://spectrum4:password@postgres:5432/spectrum4?sslmode=disable
```

## 🔄 Authentication Flow

### How User Authentication Works:

1. **Frontend Login**: User enters credentials in React app
2. **Supabase Auth**: Validates credentials and returns JWT token
3. **Backend Verification**: Backend verifies JWT with Supabase
4. **Profile Lookup**: Backend queries PostgreSQL `profiles` table for user role
5. **Authorization**: Role from PostgreSQL determines access permissions

```mermaid
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant S as Supabase
    participant B as Backend
    participant P as PostgreSQL
    
    U->>F: Login (email/password)
    F->>S: Authenticate
    S->>F: JWT token
    F->>B: API call with JWT
    B->>S: Verify JWT
    S->>B: User ID confirmed
    B->>P: Query profiles table
    P->>B: User role (admin/council/user)
    B->>F: API response with role-based data
```

## 🚨 Critical Implementation Notes

### User Role Management

**✅ CORRECT - Check PostgreSQL:**
```sql
-- When troubleshooting user permissions
SELECT id, full_name, role, updated_at 
FROM profiles 
WHERE id = 'user-uuid-from-supabase';
```

**❌ WRONG - Don't check Supabase for roles:**
```sql
-- This WON'T work - Supabase doesn't store roles
SELECT * FROM auth.users WHERE email = 'user@example.com';
```

### Backend Implementation

The backend middleware flow:
```typescript
// 1. Verify JWT with Supabase
const { data: { user }, error } = await supabase.auth.getUser(token);

// 2. Lookup profile in PostgreSQL (THE CRITICAL STEP)
const profileResult = await db
  .select()
  .from(profiles)
  .where(eq(profiles.id, user.id))
  .limit(1);

// 3. Use PostgreSQL role for authorization
const role = profileResult[0]?.role; // admin/council/user
```

## 🛠️ Development & Deployment

### Environment Configuration

**Development (.env):**
```env
# Supabase (Auth only)
SUPABASE_URL=https://bmtydjmymvvsqudonfiz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

# PostgreSQL (All app data)
DATABASE_URL=postgres://spectrum4:spectrum4password@localhost:5432/spectrum4
```

**Production (Coolify):**
```env
# Same Supabase config
SUPABASE_URL=https://bmtydjmymvvsqudonfiz.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# PostgreSQL container
DATABASE_URL=postgres://spectrum4:password@postgres:5432/spectrum4?sslmode=disable
```

### Docker Configuration

The `docker-compose.coolify.yml` includes:
- ✅ PostgreSQL container for application data
- ✅ Correct DATABASE_URL pointing to PostgreSQL
- ✅ Supabase environment variables for auth only

## 🔍 Troubleshooting Guide

### "User missing admin navigation items"

**Step 1**: Check the CORRECT database (PostgreSQL)
```bash
# Connect to PostgreSQL container
docker exec -it postgres-container-name psql -U spectrum4 -d spectrum4

# Check user role
SELECT id, full_name, role FROM profiles WHERE id = 'user-uuid';
```

**Step 2**: Update role if needed
```sql
UPDATE profiles 
SET role = 'admin', updated_at = NOW() 
WHERE id = 'user-uuid';
```

**Step 3**: User logout/login to refresh session

### "Authentication not working"

1. **Check Supabase connection**: Verify SUPABASE_URL and keys
2. **Check JWT verification**: Look for Supabase auth errors in backend logs
3. **Check profile creation**: Ensure profiles are auto-created for new users

### "Role changes not taking effect"

1. **Wrong database**: You might be updating Supabase instead of PostgreSQL
2. **Backend caching**: Restart backend service to clear any cached connections
3. **Frontend caching**: User needs to logout/login or clear browser cache

## 📝 Migration Notes

### When Adding New Users:

1. **Supabase**: User automatically created during signup/invitation
2. **PostgreSQL**: Profile auto-created by backend middleware OR manually:

```sql
INSERT INTO profiles (id, full_name, role, updated_at)
VALUES ('supabase-user-uuid', 'User Name', 'admin', NOW());
```

### When Changing User Roles:

**Always update PostgreSQL**, never Supabase:
```sql
UPDATE profiles 
SET role = 'admin', updated_at = NOW() 
WHERE id = 'supabase-user-uuid';
```

## ✅ Best Practices

### Development
- Always use `bash start-dev.sh` for local development
- PostgreSQL runs in Docker, backend/frontend run locally
- Check PostgreSQL for all user role debugging

### Deployment  
- Ensure both Supabase and PostgreSQL environment variables are set
- Verify PostgreSQL container is healthy before app container starts
- Monitor both authentication (Supabase) and application (PostgreSQL) health

### Security
- Never store sensitive business data in Supabase
- Always validate permissions using PostgreSQL roles
- Use Supabase service role key only for backend JWT verification

---

**Remember**: Supabase = Authentication, PostgreSQL = Everything Else 