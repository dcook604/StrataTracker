import express from 'express';
import { storage as dbStorage } from '../storage';
import { AuditLogger, AuditAction, TargetType } from '../audit-logger';

const router = express.Router();

// Check if user is authenticated and has admin privileges
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  // Only check role property
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: "Admin access required" });
  }

  next();
};

// Get all users (admin only)
router.get('/', isAdmin, async (_req, res) => {
  try {
    const users = await dbStorage.getAllUsers();
    // Map to a safe format if needed, for now returning as is.
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Update a user's non-auth details (e.g., fullName)
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    const { fullName } = req.body;
    
    // Validate input
    if (!fullName || typeof fullName !== 'string') {
        return res.status(400).json({ message: 'Full name is required and must be a string.' });
    }
    
    const existingUser = await dbStorage.getUser(userId);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    const updatedUser = await dbStorage.updateUser(userId, { fullName });
    
    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found after update attempt' });
    }
    
    await AuditLogger.logFromRequest(req, AuditAction.USER_UPDATED, {
      targetType: TargetType.USER,
      targetId: userId,
      details: {
        fullName: updatedUser.fullName,
      },
    });
    
    res.json({
      id: updatedUser.id,
      fullName: updatedUser.fullName,
      role: updatedUser.role,
      updatedAt: updatedUser.updatedAt
    });
  } catch (error) {
    console.error('[USER-MGMT] Error updating user:', error);
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete a user (admin only)
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (userId === (req.user as any).id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const userToDelete = await dbStorage.getUser(userId);
    if (!userToDelete) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // This should also trigger a deletion in Supabase Auth via a database trigger or a direct call.
    // For now, we are just deleting from our public.profiles table.
    const success = await dbStorage.deleteUser(userId);
    if (!success) {
      return res.status(404).json({ message: 'User not found during deletion' });
    }
    
    await AuditLogger.logFromRequest(req, AuditAction.USER_DELETED, {
      targetType: TargetType.USER,
      targetId: userId,
      details: {
        fullName: userToDelete.fullName,
      },
    });
    
    res.json({ message: 'User deleted successfully from profiles table.' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// All other user management actions are now handled by Supabase Auth.
// These include: user creation, password reset, invitations, locking, etc.

export default router;