import express from 'express';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { storage as dbStorage } from '../storage';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sendWelcomeEmail, sendPasswordResetEmail } from '../email-service';

const router = express.Router();
const scryptAsync = promisify(scrypt);

// Helper function to generate a random password
function generatePassword(length = 12) {
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
  let password = "";
  const randomValues = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomValues[i] % charset.length;
    password += charset[randomIndex];
  }
  
  return password;
}

// Middleware to check if user is admin
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user || !(req.user as any).isAdmin) {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
  next();
};

// Get all users (admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await dbStorage.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create a new user (admin only)
router.post('/', isAdmin, async (req, res) => {
  try {
    const { email, fullName, isCouncilMember, isAdmin, isUser } = req.body;
    
    // Check if user already exists
    const existingUser = await dbStorage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Generate a random password
    const password = generatePassword();
    
    // Create the user
    const user = await dbStorage.createUser({
      email,
      username: email, // Use email as username by default
      password,
      fullName,
      isCouncilMember: !!isCouncilMember,
      isAdmin: !!isAdmin,
      isUser: isUser !== false, // Default to true
      forcePasswordChange: true
    });
    
    // Send welcome email with password
    await sendWelcomeEmail(email, password, fullName);
    
    // Don't return the password in the response
    const { password: _, ...userWithoutPassword } = user;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Failed to create user' });
  }
});

// Update a user (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { fullName, isCouncilMember, isAdmin, isUser, email } = req.body;
    
    // Check if user exists
    const existingUser = await dbStorage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Update user
    const updatedUser = await dbStorage.updateUser(userId, {
      fullName: fullName || existingUser.fullName,
      isCouncilMember: isCouncilMember !== undefined ? !!isCouncilMember : existingUser.isCouncilMember,
      isAdmin: isAdmin !== undefined ? !!isAdmin : existingUser.isAdmin,
      isUser: isUser !== undefined ? !!isUser : existingUser.isUser,
      email: email || existingUser.email,
      username: email || existingUser.username
    });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Don't return sensitive data
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete a user (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check if trying to delete itself
    if (userId === (req.user as any).id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const success = await dbStorage.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Request password reset (public route)
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    
    // Check if user exists
    const user = await dbStorage.getUserByEmail(email);
    if (!user) {
      // Don't reveal that the user doesn't exist for security
      return res.json({ message: 'If your email is registered, you will receive a password reset link' });
    }
    
    // Generate reset token
    const resetToken = randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hour
    
    // Save token to database
    await dbStorage.updateUserPasswordResetToken(user.id, resetToken, resetExpires);
    
    // Send reset email
    await sendPasswordResetEmail(user.email, resetToken);
    
    res.json({ message: 'If your email is registered, you will receive a password reset link' });
  } catch (error) {
    console.error('Error requesting password reset:', error);
    res.status(500).json({ message: 'Failed to process password reset request' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).json({ message: 'Token and password are required' });
    }
    
    // Find user with valid token
    const [user] = await db.select()
      .from(users)
      .where(eq(users.passwordResetToken, token));
    
    if (!user || !user.passwordResetExpires) {
      return res.status(400).json({ message: 'Password reset token is invalid or has expired' });
    }
    
    // Check if token has expired
    if (new Date() > new Date(user.passwordResetExpires)) {
      return res.status(400).json({ message: 'Password reset token has expired' });
    }
    
    // Update password
    await dbStorage.updateUserPassword(user.id, password);
    // Clear reset token
    await dbStorage.updateUserPasswordResetToken(user.id, null, null);
    
    res.json({ message: 'Password has been updated successfully' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ message: 'Failed to reset password' });
  }
});

// Change password (authenticated users)
router.post('/change-password', async (req, res) => {
  try {
    const userId = (req.user as any).id;
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }
    
    // Get user
    const user = await dbStorage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Verify current password
    const passwordMatch = await dbStorage.comparePasswords(currentPassword, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    await dbStorage.updateUserPassword(userId, newPassword);
    
    // Make sure forcePasswordChange is set to false
    await dbStorage.updateUser(userId, {
      forcePasswordChange: false
    });
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ message: 'Failed to change password' });
  }
});

export default router;