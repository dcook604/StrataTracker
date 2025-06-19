import express from 'express';
import { z } from 'zod';
import { storage as dbStorage } from '../storage';
import logger from '../utils/logger';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for public endpoints
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit each IP to 50 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

// Middleware to check public session
const checkPublicSession = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sessionId = req.headers['x-public-session-id'] as string;
  
  if (!sessionId) {
    return res.status(401).json({ message: 'Public session required' });
  }

  try {
    const session = await dbStorage.getPublicUserSession(sessionId);
    if (!session) {
      return res.status(401).json({ message: 'Invalid or expired session' });
    }

    // Add session data to request
    req.publicSession = session;
    next();
  } catch (error) {
    logger.error('[PUBLIC_SESSION] Error checking session:', error);
    res.status(500).json({ message: 'Session verification failed' });
  }
};

// Validation schemas
const verifyCodeSchema = z.object({
  personId: z.number(),
  code: z.string().length(6),
});

const sendCodeSchema = z.object({
  personId: z.number(),
});

// GET /public/violation/:token/status
router.get('/violation/:token/status', publicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    
    const accessLink = await dbStorage.getViolationAccessLinkByToken(token);
    if (!accessLink) {
      return res.status(404).json({ message: 'Invalid or expired link' });
    }

    // Check if link is expired
    if (new Date() > accessLink.expiresAt) {
      return res.status(410).json({ message: 'Link expired' });
    }

    // Check if already used
    if (accessLink.usedAt) {
      return res.json({ status: 'used' });
    }

    // Get violation details with associated persons
    const violation = await dbStorage.getViolationWithUnit(accessLink.violationId);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    // Get persons associated with the unit
    const persons = await dbStorage.getPersonsWithRolesForUnit(violation.unitId);
    const eligiblePersons = persons.filter(p => 
      p.receiveEmailNotifications && 
      p.email === accessLink.recipientEmail
    );

    res.json({
      status: 'valid',
      violation: {
        id: violation.id,
        uuid: violation.uuid,
        violationType: violation.violationType,
        description: violation.description,
        unitNumber: violation.unit.unitNumber,
        persons: eligiblePersons,
      }
    });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATION] Error getting status:', error);
    res.status(500).json({ message: 'Failed to get violation status' });
  }
});

// POST /public/violation/:token/send-code
router.post('/violation/:token/send-code', publicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { personId } = sendCodeSchema.parse(req.body);

    const accessLink = await dbStorage.getViolationAccessLinkByToken(token);
    if (!accessLink || new Date() > accessLink.expiresAt) {
      return res.status(404).json({ message: 'Invalid or expired link' });
    }

    // Generate 6-digit verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minute expiry

    await dbStorage.addEmailVerificationCode({
      personId,
      violationId: accessLink.violationId,
      codeHash,
      expiresAt,
    });

    // TODO: Send email with verification code
    logger.info(`[PUBLIC_VIOLATION] Verification code generated for person ${personId}, violation ${accessLink.violationId}`);
    
    res.json({ message: 'Verification code sent' });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATION] Error sending code:', error);
    res.status(500).json({ message: 'Failed to send verification code' });
  }
});

// POST /public/violation/:token/verify-code
router.post('/violation/:token/verify-code', publicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    const { personId, code } = verifyCodeSchema.parse(req.body);

    const accessLink = await dbStorage.getViolationAccessLinkByToken(token);
    if (!accessLink || new Date() > accessLink.expiresAt) {
      return res.status(404).json({ message: 'Invalid or expired link' });
    }

    const codeHash = crypto.createHash('sha256').update(code).digest('hex');
    const verificationRecord = await dbStorage.getEmailVerificationCode(personId, accessLink.violationId, codeHash);
    
    if (!verificationRecord) {
      return res.status(400).json({ message: 'Invalid verification code' });
    }

    // Mark verification code as used
    await dbStorage.markEmailVerificationCodeUsed(verificationRecord.id);

    // Get person and unit details
    const persons = await dbStorage.getPersonsWithRolesForUnit(accessLink.violationId);
    const person = persons.find(p => p.personId === personId);
    
    if (!person) {
      return res.status(400).json({ message: 'Person not found' });
    }

    // Get violation to determine unit
    const violation = await dbStorage.getViolationWithUnit(accessLink.violationId);
    if (!violation) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    // Create public user session
    const session = await dbStorage.createPublicUserSession({
      personId: person.personId,
      unitId: violation.unitId,
      email: person.email,
      role: person.role,
      expiresInHours: 24, // 24 hour session
    });

    if (!session) {
      return res.status(500).json({ message: 'Failed to create session' });
    }

    res.json({ 
      message: 'Code verified successfully',
      sessionId: session.sessionId,
      userInfo: {
        fullName: person.fullName,
        email: person.email,
        role: person.role,
        unitNumber: violation.unit.unitNumber,
      }
    });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATION] Error verifying code:', error);
    res.status(500).json({ message: 'Failed to verify code' });
  }
});

// GET /public/violations - Get all violations for the authenticated unit
router.get('/violations', checkPublicSession, async (req, res) => {
  try {
    const { unitId } = req.publicSession;
    
    // Get all violations for this unit (excluding sensitive statuses if needed)
    const violations = await dbStorage.getViolationsForUnit(unitId, [
      'new', 'pending_approval', 'approved', 'disputed', 'rejected'
    ]);

    res.json({ violations });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATIONS] Error getting violations:', error);
    res.status(500).json({ message: 'Failed to get violations' });
  }
});

// GET /public/violations/:id - Get specific violation details
router.get('/violations/:id', checkPublicSession, async (req, res) => {
  try {
    const { unitId } = req.publicSession;
    const violationId = parseInt(req.params.id);

    if (isNaN(violationId)) {
      return res.status(400).json({ message: 'Invalid violation ID' });
    }

    const violation = await dbStorage.getViolationWithUnit(violationId);
    if (!violation || violation.unitId !== unitId) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    const history = await dbStorage.getViolationHistory(violationId);

    res.json({ 
      violation,
      history: history.filter(h => !h.action?.includes('internal')) // Filter sensitive history
    });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATIONS] Error getting violation details:', error);
    res.status(500).json({ message: 'Failed to get violation details' });
  }
});

// POST /public/violations/:id/dispute - Submit dispute for a violation
router.post('/violations/:id/dispute', checkPublicSession, async (req, res) => {
  try {
    const { unitId, fullName } = req.publicSession;
    const violationId = parseInt(req.params.id);
    const { comment } = req.body;

    if (isNaN(violationId)) {
      return res.status(400).json({ message: 'Invalid violation ID' });
    }

    const violation = await dbStorage.getViolationWithUnit(violationId);
    if (!violation || violation.unitId !== unitId) {
      return res.status(404).json({ message: 'Violation not found' });
    }

    // Update violation status to disputed
    await dbStorage.updateViolationStatus(violationId, 'disputed');

    // Add history entry
    await dbStorage.addViolationHistory({
      violationId: violationId,
      action: 'dispute_submitted',
      comment: comment,
      commenterName: fullName,
    });

    res.json({ message: 'Dispute submitted successfully' });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATIONS] Error submitting dispute:', error);
    res.status(500).json({ message: 'Failed to submit dispute' });
  }
});

// POST /public/logout - End public session
router.post('/logout', checkPublicSession, async (req, res) => {
  try {
    const { sessionId } = req.publicSession;
    await dbStorage.expirePublicUserSession(sessionId);
    res.json({ message: 'Session ended successfully' });
  } catch (error) {
    logger.error('[PUBLIC_VIOLATIONS] Error ending session:', error);
    res.status(500).json({ message: 'Failed to end session' });
  }
});

export default router; 