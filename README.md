# Spectrum 4 Violation System

## Features

- **User Management**: Admins can add, edit, lock/unlock, and invite users. Roles include User, Council Member, and Administrator.
- **User Profile Page**: All users can view and edit their own profile (except roles) and change their password. Accessible from the user menu in the header.
- **Password Strength Meter**: All password forms (Add/Edit User, Reset Password, Change Password, User Profile) include a real-time password strength meter using zxcvbn.
- **Account Locking**: Admins can manually lock/unlock accounts and specify a lock reason.
- **Pagination & Sorting**: Large tables (users, violations, customers) support pagination, page size selection, and server-side sorting/filtering.
- **Accessible Navigation**: Sidebar and user menu are accessible and clearly indicate the current section.

## User Profile Page

- Click your avatar or name in the top right header to open the user menu.
- Select **Profile** to view and edit your profile information (name, email, username).
- Change your password in the "Change Password" section. The password strength meter will guide you to choose a secure password.

## Password Strength Meter

- All password forms display a strength meter and suggestions as you type.
- Passwords are rated from "Very Weak" to "Strong" using the zxcvbn library.
- Users are encouraged to use strong passwords for better security.

## User Menu

- The user menu is accessible from the header (avatar/name).
- Options:
  - **Profile**: Go to your user profile page.
  - **Logout**: Sign out of the application.

## Security Enhancements

- Passwords must meet minimum strength requirements.
- Admins can lock/unlock accounts and specify reasons.
- All sensitive actions are protected by role-based access control.

## Getting Started

1. Install dependencies: `npm install`
2. Start the development server: `npm run dev`
3. Log in as an admin to access user management and other admin features.

---

For more details, see the in-app help or contact your system administrator. 