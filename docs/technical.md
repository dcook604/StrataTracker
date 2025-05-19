# Technical Specifications

## System Requirements

### Server Requirements
- Node.js v14 or higher
- PostgreSQL 12 or higher
- 2GB RAM minimum
- 10GB storage minimum
- Linux/Unix-based OS recommended

### Client Requirements
- Modern web browser (Chrome, Firefox, Safari, Edge)
- JavaScript enabled
- Minimum screen resolution: 1024x768
- Internet connection

## Development Environment

### Required Tools
- Node.js and npm
- Git
- PostgreSQL
- Code editor (VS Code recommended)
- Docker (optional)

### Development Dependencies
```json
{
  "dependencies": {
    "express": "^4.18.2",
    "react": "^18.2.0",
    "typescript": "^5.0.0",
    "drizzle-orm": "^0.28.0",
    "passport": "^0.6.0",
    "zod": "^3.21.0"
  }
}
```

## Database Specifications

### PostgreSQL Configuration
```sql
-- Recommended PostgreSQL settings
max_connections = 100
shared_buffers = 256MB
effective_cache_size = 768MB
maintenance_work_mem = 64MB
checkpoint_completion_target = 0.9
wal_buffers = 16MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
work_mem = 4MB
min_wal_size = 1GB
max_wal_size = 4GB
```

### Database Schema Details

#### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uuid UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT NOT NULL,
  is_council_member BOOLEAN DEFAULT false NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  is_user BOOLEAN DEFAULT true NOT NULL,
  last_login TIMESTAMP,
  failed_login_attempts INTEGER DEFAULT 0,
  account_locked BOOLEAN DEFAULT false,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMP,
  force_password_change BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

#### Violations Table
```sql
CREATE TABLE violations (
  id SERIAL PRIMARY KEY,
  reference_number UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE,
  unit_id INTEGER NOT NULL REFERENCES property_units(id),
  reported_by_id INTEGER NOT NULL REFERENCES users(id),
  category_id INTEGER REFERENCES violation_categories(id),
  violation_type TEXT NOT NULL,
  violation_date TIMESTAMP NOT NULL,
  violation_time TEXT,
  description TEXT NOT NULL,
  bylaw_reference TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  fine_amount INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  attachments JSONB DEFAULT '[]',
  pdf_generated BOOLEAN DEFAULT false,
  pdf_path TEXT
);
```

## API Specifications

### Authentication

#### Login Request
```typescript
interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}
```

#### Login Response
```typescript
interface LoginResponse {
  id: number;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isCouncilMember: boolean;
}
```

### Violation Management

#### Create Violation Request
```typescript
interface CreateViolationRequest {
  unitId: number;
  categoryId?: number;
  violationType: string;
  violationDate: string;
  violationTime?: string;
  description: string;
  bylawReference?: string;
  attachments?: File[];
}
```

#### Violation Response
```typescript
interface ViolationResponse {
  id: number;
  referenceNumber: string;
  unitId: number;
  reportedById: number;
  categoryId?: number;
  violationType: string;
  violationDate: string;
  violationTime?: string;
  description: string;
  bylawReference?: string;
  status: ViolationStatus;
  fineAmount?: number;
  attachments: string[];
  createdAt: string;
  updatedAt: string;
}
```

## Security Specifications

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

### Session Configuration
```typescript
const sessionConfig = {
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 30 * 60 * 1000, // 30 minutes
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
};
```

### Rate Limiting
```typescript
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: 'Too many requests, please try again later'
};
```

## File Upload Specifications

### Allowed File Types
- Images: jpg, jpeg, png, gif
- Documents: pdf
- Maximum file size: 5MB
- Maximum files per upload: 5

### File Storage
- Local filesystem storage
- Organized by date and type
- Secure file naming
- Access control

## Email Specifications

### SMTP Configuration
```typescript
interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}
```

### Email Templates
- Welcome email
- Password reset
- Violation notification
- Violation approval
- Violation dispute

## Performance Specifications

### Response Time Targets
- API responses: < 200ms
- Page loads: < 2s
- File uploads: < 5s
- Report generation: < 10s

### Caching Strategy
- Browser caching
- API response caching
- Static asset caching
- Database query caching

## Monitoring Specifications

### Logging Levels
- ERROR: System errors
- WARN: Warning conditions
- INFO: General information
- DEBUG: Debug information

### Metrics to Monitor
- Response times
- Error rates
- User activity
- Resource usage
- Database performance

## Testing Specifications

### Unit Testing
- Jest for JavaScript/TypeScript
- Minimum 80% coverage
- Component testing
- API endpoint testing

### Integration Testing
- API integration tests
- Database integration tests
- End-to-end testing
- Performance testing

## Deployment Specifications

### Production Environment
- Node.js cluster mode
- Nginx reverse proxy
- SSL/TLS encryption
- Database replication
- Regular backups

### CI/CD Pipeline
- Automated testing
- Code quality checks
- Security scanning
- Automated deployment
- Rollback capability

## UI Components

### Logo Component

The Logo component is a reusable element that displays the Spectrum 4 logo consistently across the application.

#### Usage

```tsx
import { Logo } from "@/components/logo";

// Basic usage with default size (md) and text
<Logo />

// Large logo without text (e.g., for auth page)
<Logo size="lg" showText={false} />

// Small logo with text (e.g., for compact spaces)
<Logo size="sm" />
```

#### Props

- `size`: Controls the logo size
  - `'sm'`: 32x32px (h-8 w-8)
  - `'md'`: 40x40px (h-10 w-10)
  - `'lg'`: 80x80px (h-20 w-20)
- `showText`: Boolean to toggle the "Spectrum 4 Violation System" text (default: true)

#### Asset Management

The logo assets are stored in the `/public/images/` directory:
- `spectrum4-logo.png`: Primary high-quality PNG logo
- `logo.jpeg`: Fallback JPEG version

The component automatically handles:
- Responsive sizing
- Error fallback to JPEG if PNG fails to load
- Consistent styling with white background and rounded corners
- Dark mode support for accompanying text

#### Implementation Details

- Uses Tailwind CSS for styling
- Maintains aspect ratio using `object-contain`
- Implements error handling for image loading
- Supports dark mode for text elements
- Provides consistent spacing and alignment

#### Best Practices

1. Use the appropriate size prop based on context:
   - `lg`: Authentication and splash screens
   - `md`: Navigation and headers
   - `sm`: Compact spaces or mobile views

2. Consider text visibility:
   - Enable text in navigation/header contexts
   - Disable text when logo is used as a visual element

3. Container Considerations:
   - Logo has a white background for consistency
   - Rounded corners (rounded-md) for better visual integration
   - Overflow is handled automatically

#### Example Implementations

1. In Navigation:
```tsx
<div className="flex items-center h-16 px-4 border-b">
  <Logo size="md" />
</div>
```

2. In Auth Page:
```tsx
<div className="flex justify-center mb-4">
  <Logo size="lg" showText={false} />
</div>
```

3. In Mobile Header:
```tsx
<div className="flex items-center">
  <Logo size="sm" showText={false} />
</div>
``` 