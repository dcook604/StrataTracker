import { Profile } from '../../shared/schema';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: Profile & {
        isAdmin?: boolean;
        isCouncilMember?: boolean; 
        isUser?: boolean;
        email?: string;
        username?: string;
        password?: string;
        passwordResetToken?: string;
        passwordResetExpires?: Date;
        failedLoginAttempts?: number;
        forcePasswordChange?: boolean;
      };
      isAuthenticated?: () => boolean;
      publicSession?: {
        sessionId: string;
        personId: number;
        unitId: number;
        email: string;
        role: string;
        fullName: string;
        unitNumber: string;
        expiresAt: Date;
      };
    }
  }
} 