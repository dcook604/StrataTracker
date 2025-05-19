# Strata Violations Management System

A comprehensive web application for managing strata property violations, built with TypeScript, Express.js, and React.

## 🌟 Features

### User Management
- Multi-level user roles (Admin, Council Member, Regular User)
- Secure authentication with Passport.js
- Password reset functionality
- Session management with rate limiting
- User profile management

### Violation Management
- Create and track property violations
- Support for multiple violation categories
- File attachments (images and PDFs)
- Violation status tracking (new, pending_approval, approved, disputed, rejected)
- Fine management system
- Violation history and comments

### Customer Management
- Property unit management
- Owner and tenant information tracking
- Contact details management
- Search functionality

### Reporting
- Violation statistics
- Monthly violation reports
- Violation type analysis
- Repeat violation tracking

### Email System
- Configurable SMTP settings
- Automated violation notifications
- Welcome emails for new users
- Password reset emails

### Security Features
- Helmet.js for security headers
- Rate limiting for login attempts
- Secure session management
- XSS protection
- CSRF protection
- Secure password handling

## 🛠 Technical Stack

### Backend
- Node.js with Express
- TypeScript
- PostgreSQL with Drizzle ORM
- Passport.js for authentication
- Express-session for session management
- Multer for file uploads

### Frontend
- React with TypeScript
- React Query for data fetching
- Wouter for routing
- Tailwind CSS for styling
- Next-themes for theme management

### Development Tools
- Vite for development server
- ESLint for code linting
- TypeScript for type safety
- Zod for runtime type validation

## 🔒 Security

The application implements several security measures:

1. **Authentication**
   - Secure password hashing
   - Session-based authentication
   - Rate limiting on login attempts
   - Account locking after failed attempts

2. **Authorization**
   - Role-based access control
   - Protected routes
   - Admin-only features

3. **Data Protection**
   - Input validation
   - XSS protection
   - CSRF protection
   - Secure headers

4. **File Security**
   - File type validation
   - File size limits
   - Secure file storage

## 📁 Project Structure

```
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utility functions
│   │   ├── pages/        # Page components
│   │   └── App.tsx       # Main application component
│   └── ...
├── server/                # Backend Express application
│   ├── routes/           # API route handlers
│   ├── middleware/       # Express middleware
│   ├── utils/           # Utility functions
│   └── ...
├── shared/               # Shared types and schemas
│   └── schema.ts        # Database schemas and types
└── docs/                # Documentation
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Configure the database:
   ```bash
   npm run db:migrate
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

## 📝 API Documentation

### Authentication Endpoints
- `POST /api/login` - User login
- `POST /api/logout` - User logout
- `POST /api/register` - Admin-only user registration
- `POST /api/forgot-password` - Request password reset
- `POST /api/reset-password` - Reset password with token

### User Management
- `GET /api/users` - Get all users (admin only)
- `PATCH /api/users/:id` - Update user (admin only)
- `DELETE /api/users/:id` - Delete user (admin only)

### Violation Management
- `GET /api/violations` - Get all violations
- `POST /api/violations` - Create new violation
- `GET /api/violations/:id` - Get violation details
- `PATCH /api/violations/:id/status` - Update violation status
- `PATCH /api/violations/:id/fine` - Set violation fine

### Customer Management
- `GET /api/customers` - Get all customers
- `POST /api/customers` - Create new customer
- `GET /api/customers/search` - Search customers
- `PATCH /api/customers/:id` - Update customer

### Reports
- `GET /api/reports/stats` - Get violation statistics
- `GET /api/reports/violations-by-month` - Get monthly violations
- `GET /api/reports/violations-by-type` - Get violations by type
- `GET /api/reports/repeat-violations` - Get repeat violations

## 🔧 Configuration

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Session encryption key
- `NODE_ENV` - Environment (development/production)
- `SMTP_*` - Email configuration

### Email Configuration
The system supports configurable SMTP settings through the admin interface:
- SMTP host and port
- Authentication credentials
- Secure connection options
- From address configuration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## Asset Management

### Logo and Branding

The system uses a consistent branding approach through the `Logo` component. Assets are stored in the `/public/images/` directory:

- Primary Logo: `spectrum4-logo.png`
- Fallback Logo: `logo.jpeg`

For detailed implementation and usage guidelines, see:
- [Logo Component Documentation](technical.md#logo-component)
- [UI Components Guide](technical.md#ui-components)

### Directory Structure

```
public/
  ├── images/
  │   ├── spectrum4-logo.png  # Primary logo
  │   └── logo.jpeg          # Fallback logo
  └── favicon.ico            # Site favicon
```

### Usage Guidelines

1. Always use the `Logo` component instead of direct image references
2. Follow the size guidelines for different contexts
3. Ensure both PNG and JPEG versions are maintained for compatibility

For more details on UI components and styling, refer to the [Technical Documentation](technical.md). 