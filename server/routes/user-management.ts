import express from 'express';
import { randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';
import { storage as dbStorage } from '../storage';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { sendWelcomeEmail, sendPasswordResetEmail, sendInvitationEmail } from '../email-service';
import { AuditLogger, AuditAction, TargetType } from '../audit-logger';

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

// Check if user is authenticated and has admin privileges
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.isAuthenticated || !req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Only check role property
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

// Get all users (admin only)
router.get('/', isAdmin, async (req, res) => {
  try {
    const users = await dbStorage.getAllUsers();
    // Remove sensitive fields and include lockReason
    const safeUsers = users.map((u) => u); // No sensitive fields to remove, just return the user as is
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Create a new user (admin only)
router.post('/', isAdmin, (req, res) => {
  res.status(501).json({ message: 'User creation is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Update a user (admin only)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName } = req.body;
    
    // Check if user exists
    const existingUser = await dbStorage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updateData = { fullName };
    
    // Update user
    const updatedUser = await dbStorage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update' });
    }
    
    // Log audit event
    await AuditLogger.logFromRequest(req, AuditAction.USER_UPDATED, {
      targetType: TargetType.USER,
      targetId: userId,
      details: {
        fullName: updatedUser.fullName,
      },
    });
    
    // API response: only return id, fullName, role, updatedAt
    const { id: uid, fullName: updatedName, role: updatedRole, updatedAt: updatedTime } = updatedUser;
    res.json({ id: uid, fullName: updatedName, role: updatedRole, updatedAt: updatedTime });
  } catch (error) {
    console.error('[USER-MGMT] Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete a user (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Check if trying to delete itself
    if (userId === (req.user as any).id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Get user details before deletion for audit log
    const userToDelete = await dbStorage.getUser(userId);
    
    const success = await dbStorage.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Log audit event
    if (userToDelete) {
      await AuditLogger.logFromRequest(req, AuditAction.USER_DELETED, {
        targetType: TargetType.USER,
        targetId: userId,
        details: {
          fullName: userToDelete.fullName,
        },
      });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Request password reset (public route)
router.post('/forgot-password', (req, res) => {
  res.status(501).json({ message: 'Password reset is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Reset password with token
router.post('/reset-password', (req, res) => {
  res.status(501).json({ message: 'Password reset is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Change password (authenticated users)
router.post('/change-password', (req, res) => {
  res.status(501).json({ message: 'Password change is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Manually lock a user (admin only)
router.post('/:id/lock', isAdmin, (req, res) => {
  res.status(501).json({ message: 'User locking is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Unlock a locked user (admin only)
router.post('/:id/unlock', isAdmin, (req, res) => {
  res.status(501).json({ message: 'User unlocking is managed by Supabase Auth. This endpoint is not implemented.' });
});

// Invite a new user (admin only)
router.post('/invite', isAdmin, (req, res) => {
  res.status(501).json({ message: 'User invitation is managed by Supabase Auth. This endpoint is not implemented.' });
});

export default router;