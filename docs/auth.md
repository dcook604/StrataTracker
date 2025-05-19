# Authentication System Documentation

## Overview

The authentication system is built using Passport.js with a local strategy, implementing session-based authentication with secure password handling and role-based access control.

## Core Components

### 1. Session Management
```typescript
const sessionSettings: session.SessionOptions = {
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  store: new session.MemoryStore(),
  cookie: {
    maxAge: 1000 * 60 * 30, // 30 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  }
};
```

### 2. Security Middleware
```typescript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
    },
  },
  xssFilter: true,
  noSniff: true,
  referrerPolicy: { policy: "same-origin" }
}));
```

### 3. Rate Limiting
```typescript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per window
  message: "Too many login attempts, please try again after 15 minutes",
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Authentication Flow

### 1. Login Process
1. User submits credentials
2. Rate limiting check
3. Passport local strategy validation
4. Session creation
5. Response with user data

### 2. Session Management
- Sessions stored in MemoryStore (temporary solution)
- 30-minute session timeout
- Secure cookie settings
- Session serialization/deserialization

### 3. Password Handling
- Secure password comparison
- Support for both hashed and plain text passwords (transitional)
- Password reset functionality
- Account locking after failed attempts

## User Roles and Permissions

### Role Types
1. **Admin** (`isAdmin`)
   - Full system access
   - User management
   - System configuration

2. **Council Member** (`isCouncilMember`)
   - Violation management
   - Customer management
   - Report access

3. **Regular User** (`isUser`)
   - Basic violation reporting
   - Profile management

### Role Checking
```typescript
// Admin check
if (!req.isAuthenticated() || !(req.user.isAdmin || req.user.is_admin)) {
  return res.status(403).json({ message: "Admin access required" });
}

// Council member check
if (!req.isAuthenticated() || !(req.user.isCouncilMember || req.user.is_council_member)) {
  return res.status(403).json({ message: "Council access required" });
}
```

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register` - Admin-only user registration
- `POST /api/forgot-password` - Password reset request
- `POST /api/reset-password` - Password reset with token

### User Management
- `GET /api/users` - List users (admin only)
- `PATCH /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

## Security Features

### 1. Password Requirements
- Minimum 8 characters
- Uppercase letter required
- Lowercase letter required
- Number required
- Special character required

### 2. Session Security
- HTTP-only cookies
- Secure cookies in production
- SameSite cookie policy
- Session timeout

### 3. Protection Against
- Brute force attacks (rate limiting)
- XSS attacks (Helmet.js)
- CSRF attacks (SameSite cookies)
- Session hijacking (secure cookies)

## Implementation Details

### Passport Configuration
```typescript
passport.use(
  new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        const user = await dbStorage.getUserByEmail(email);
        
        if (user?.accountLocked) {
          return done(null, false, { message: "Account locked" });
        }
        
        if (!user) {
          return done(null, false, { message: "Invalid credentials" });
        }
        
        const isMatch = await dbStorage.comparePasswords(password, user.password);
        if (!isMatch) {
          await dbStorage.incrementFailedLoginAttempts(user.id);
          return done(null, false, { message: "Invalid credentials" });
        }
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);
```

### Session Serialization
```typescript
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await dbStorage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});
```

## Known Issues and Limitations

1. **Session Store**
   - Currently using MemoryStore (not suitable for production)
   - Need to migrate to a persistent store (Redis recommended)

2. **Password Storage**
   - Supporting both hashed and plain text passwords
   - Need to complete migration to hashed passwords only

3. **Role Management**
   - Supporting both camelCase and snake_case formats
   - Need to standardize on one format

## Future Improvements

1. **Session Management**
   - Implement Redis session store
   - Add session invalidation
   - Implement refresh tokens

2. **Authentication**
   - Add OAuth support
   - Implement 2FA
   - Add API key authentication

3. **Security**
   - Implement IP-based blocking
   - Add security audit logging
   - Enhance password policies

## Best Practices

1. **Session Management**
   - Always use secure cookies in production
   - Implement proper session cleanup
   - Monitor session usage

2. **Password Handling**
   - Never store plain text passwords
   - Use strong password hashing
   - Implement password rotation

3. **Access Control**
   - Implement proper role checks
   - Use middleware for authorization
   - Log access attempts

## Troubleshooting

### Common Issues

1. **Session Not Persisting**
   - Check cookie settings
   - Verify session store configuration
   - Check client-side cookie handling

2. **Authentication Failures**
   - Verify user credentials
   - Check account lock status
   - Review rate limiting settings

3. **Permission Issues**
   - Verify user roles
   - Check role checking logic
   - Review middleware order 