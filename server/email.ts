import nodemailer from 'nodemailer';
import { loadEmailSettings, getEmailNotificationSubjects } from './email-service';
import { sendEmailWithDeduplication, EmailDeduplicationService, type EmailRequest } from './email-deduplication';
import { db } from './db';
import { unitPersonRoles, persons as PersonsSchema, type User as AdminUserType, type Violation } from '../shared/schema';
import { and, eq } from 'drizzle-orm';
import { supabaseAdmin } from './supabase-client';

// Initialize with default local configuration
let transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

// NEW Interface for notifying occupants about a new violation
export interface NewViolationToOccupantsNotificationParams {
  violationId: number;
  referenceNumber: string; // Add reference number field
  unitId: number; // Still needed for metadata or context
  unitNumber: string;
  violationType: string;
  reporterName: string; // Name of the user who reported the violation
  personsToNotify: Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string; // 'owner' or 'tenant'
    receiveEmailNotifications: boolean;
    accessLink?: string; // The unique dispute link for this person
  }>;
}

// Interface for violation approved notification
interface ViolationApprovedParams {
  violationId: string;
  unitNumber: string;
  violationType: string;
  ownerEmail: string;
  ownerName: string;
  fineAmount: number;
  unitId: number;
  tenantEmail?: string;
  tenantName?: string;
}

export interface ViolationPendingApprovalAdminNotificationParams {
  violation: Pick<Violation, 'id' | 'uuid' | 'violationType' | 'referenceNumber'> & { unitNumber?: string }; // Key violation details
  adminUser: Pick<AdminUserType, 'id' | 'fullName' | 'email'>; // Added 'id' to the Pick
  reporterName: string;
  appUrl: string; // Base URL of the application
}

export interface ViolationDisputedAdminNotificationParams {
  violation: Pick<Violation, 'id' | 'uuid' | 'violationType' | 'referenceNumber'> & { unitNumber?: string };
  adminUser: Pick<AdminUserType, 'id' | 'fullName' | 'email'>;
  disputedBy: string; // Name of person who disputed (from commenterName or person record)
  appUrl: string;
}

export interface ViolationRejectedOccupantNotificationParams {
  violation: Pick<Violation, 'id' | 'uuid' | 'violationType' | 'referenceNumber'> & { unitNumber?: string };
  rejectionReason: string;
  rejectedBy: string; // Name of admin/council member who rejected it
  personsToNotify: Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string; // 'owner' or 'tenant'
    receiveEmailNotifications: boolean;
  }>;
}

export interface ViolationApprovedOccupantNotificationParams {
  violation: Pick<Violation, 'id' | 'uuid' | 'violationType' | 'referenceNumber'> & { unitNumber?: string };
  fineAmount: number;
  approvedBy: string; // Name of admin/council member who approved it
  personsToNotify: Array<{
    personId: number;
    fullName: string;
    email: string;
    role: string; // 'owner' or 'tenant'
    receiveEmailNotifications: boolean;
  }>;
}

// Always try to send email with current SMTP settings
const sendEmail = async (mailOptions: nodemailer.SendMailOptions) => {
  try {
    // Get the latest email configuration
    const emailConfig = await loadEmailSettings();
    
    if (emailConfig) {
      // Update transporter with the latest settings
      transporter = nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth.user ? emailConfig.auth : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });
      
      // Set from address if not provided
      if (!mailOptions.from) {
        mailOptions.from = emailConfig.from;
      }
    }
    
    // Send the email
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    // Log email details in dev mode for debugging
    if (process.env.NODE_ENV !== "production") {
      console.log("Email details (not sent due to error):");
      console.log("To:", mailOptions.to);
      console.log("Subject:", mailOptions.subject);
      console.log("Text:", mailOptions.text);
    }
    throw error;
  }
};

// Send notification when a new violation is reported to occupants (owners/tenants)
export const sendNewViolationToOccupantsNotification = async (params: NewViolationToOccupantsNotificationParams) => {
  const {
    violationId,
    referenceNumber,
    unitId,
    unitNumber,
    violationType,
    reporterName,
    personsToNotify,
  } = params;

  for (const person of personsToNotify) {
    if (person.receiveEmailNotifications && person.email) {
      const subjects = await getEmailNotificationSubjects();
      let subject = subjects.newViolation;
      
      subject = subject.replace(/\[.*?\]\s*/, '');

      const emailSettings = await loadEmailSettings();
      const senderName = emailSettings?.fromName || 'Strata Management';
      const senderEmail = emailSettings?.from || 'no-reply@spectrum4.ca';
      
      // Generate Magic Link
      const { data, error: otpError } = await supabaseAdmin.auth.signInWithOtp({
        email: person.email,
        options: {
          shouldCreateUser: true, // Create the user if they don't exist
          emailRedirectTo: `${process.env.APP_URL}/public/violations?session_token={RAW_SESSION_TOKEN}`, // Redirect to public violation page
        },
      });

      if (otpError) {
        console.error(`[VIOLATION_EMAIL] Error generating magic link for ${person.email}:`, otpError);
        continue; // Skip this person
      }
      
      const magicLink = data.properties?.action_link;

      if (!magicLink) {
        console.error(`[VIOLATION_EMAIL] Could not retrieve magic link for ${person.email}.`);
        continue;
      }

      const textContent = `
Dear ${person.fullName},

A new violation has been reported for Unit ${unitNumber} associated with your ${person.role === 'owner' ? 'ownership' : 'tenancy'}.

Violation Details:
- Reference Number: ${referenceNumber}
- Unit Number: ${unitNumber}
- Type: ${violationType}
- Reported by: ${reporterName}

You have 30 days to respond to this violation. If you would like to dispute this violation, or add comments and evidence, please use the following secure link:
${magicLink}

If no response is received within 30 days, this violation may proceed according to the strata bylaws.

Thank you,
${senderName}
      `;

      const emailRequest: EmailRequest = {
        to: person.email,
        subject,
        text: textContent,
        from: `"${senderName}" <${senderEmail}>`,
        emailType: 'violation_notification',
        metadata: {
          violationId,
          unitId,
          unitNumber,
          personId: person.personId,
          recipientType: person.role,
          recipientEmail: person.email,
        },
        // Idempotency key can be generated by the service or explicitly here:
        // idempotencyKey: `violation-${violationId}-new-occupant-${person.personId}`
      };

      try {
        const emailResult = await EmailDeduplicationService.sendEmailWithDeduplication(emailRequest);
        if (emailResult.success) {
          console.log(`[VIOLATION_EMAIL] New violation notification sent to ${person.role} ${person.fullName} (${person.email}) for violation ${violationId}. Message: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
        } else {
          console.error(`[VIOLATION_EMAIL] Failed to send new violation notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violationId}. Reason: ${emailResult.message}`);
        }
      } catch (error) {
        console.error(`[VIOLATION_EMAIL] Error sending new violation notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violationId}:`, error);
      }
    } else if (!person.receiveEmailNotifications) {
      console.log(`[VIOLATION_EMAIL] Skipping notification for ${person.role} ${person.fullName} (${person.email}) for violation ${violationId} due to notification preferences.`);
    }
  }
};

// Send notification when a violation is approved with a fine
export const sendViolationApprovedNotification = async (params: ViolationApprovedParams) => {
  const {
    violationId,
    unitNumber,
    violationType,
    ownerEmail,
    ownerName,
    fineAmount,
    unitId,
    tenantEmail,
    tenantName,
  } = params;

  const subjects = await getEmailNotificationSubjects();
  const subject = subjects.violationApproval;
  const text = `
    Dear ${ownerName},

    The violation reported for Unit ${unitNumber} has been approved by the strata council.

    Violation Details:
    - Violation ID: ${violationId}
    - Type: ${violationType}
    - Fine Amount: $${fineAmount.toFixed(2)}

    This fine will be added to your strata fee account. Please ensure that the payment is made
    within 30 days to avoid additional penalties.

    Thank you,
    StrataGuard System
  `;

  // Get notification preferences
  const [ownerRole] = await db.select().from(unitPersonRoles)
    .where(and(
      eq(unitPersonRoles.unitId, unitId),
      eq(unitPersonRoles.role, 'owner')
    ));

  // Send to owner if they want notifications
  if (ownerRole?.receiveEmailNotifications) {
    const emailResult = await sendEmailWithDeduplication({
      from: '"StrataGuard System" <notifications@strataguard.com>',
      to: ownerEmail,
      subject,
      text,
      emailType: 'violation_approved',
      metadata: {
        violationId,
        unitId,
        unitNumber,
        fineAmount,
        recipientType: 'owner',
        recipientEmail: ownerEmail
      }
    });

    console.log(`[VIOLATION_APPROVED_EMAIL] Owner notification for violation ${violationId}: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
  }

  // Get tenant notification preferences if tenant exists
  if (tenantEmail && tenantName) {
    const [tenantRole] = await db.select().from(unitPersonRoles)
      .where(and(
        eq(unitPersonRoles.unitId, unitId),
        eq(unitPersonRoles.role, 'tenant')
      ));

    // Send to tenant if they want notifications
    if (tenantRole?.receiveEmailNotifications) {
      const tenantEmailResult = await sendEmailWithDeduplication({
        from: '"StrataGuard System" <notifications@strataguard.com>',
        to: tenantEmail,
        subject,
        text: text.replace(ownerName, tenantName),
        emailType: 'violation_approved',
        metadata: {
          violationId,
          unitId,
          unitNumber,
          fineAmount,
          recipientType: 'tenant',
          recipientEmail: tenantEmail
        }
      });

      console.log(`[VIOLATION_APPROVED_EMAIL] Tenant notification for violation ${violationId}: ${tenantEmailResult.message} ${tenantEmailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
    }
  }
};

export const sendViolationPendingApprovalToAdminsNotification = async (params: ViolationPendingApprovalAdminNotificationParams) => {
  const { violation, adminUser, reporterName, appUrl } = params;

  if (!adminUser.email) {
    console.warn(`[ADMIN_NOTIFICATION_SKIP] Admin user ${adminUser.fullName} has no email address.`);
    return;
  }

  const subjects = await getEmailNotificationSubjects();
  const subject = subjects.violationApproval;
  // TODO: Create a proper HTML template for this email
  const violationDetailsLink = `${appUrl}/violations/${violation.uuid || violation.id}`;

  const textContent = `
Dear ${adminUser.fullName},

A new violation has been reported and is awaiting approval:

Violation Details:
- Reference Number: ${violation.referenceNumber}
- Type: ${violation.violationType}
- Unit Number: ${violation.unitNumber || 'N/A'}
- Reported By: ${reporterName}

Please review this violation at your earliest convenience.

View Violation Details: ${violationDetailsLink}

Thank you,
StrataGuard System
  `;

  const emailRequest: EmailRequest = {
    to: adminUser.email,
    subject,
    text: textContent,
    // html: "...", // TODO: Add HTML content using a template
    from: '"StrataGuard System" <notifications@strataguard.com>', // Consider making this configurable
    emailType: 'system', // Or a more specific type like 'admin_violation_alert'
    metadata: {
      violationId: violation.id,
      violationUuid: violation.uuid,
      adminUserId: (adminUser as any).id, // If adminUser has an ID, include it
      recipientType: 'admin/council',
    },
    // Idempotency key can be generated by the service or explicitly here:
    idempotencyKey: `violation-${violation.uuid || violation.id}-pending-approval-admin-${(adminUser as any).id || adminUser.email}`
  };

  try {
    const emailResult = await EmailDeduplicationService.sendEmailWithDeduplication(emailRequest);
    if (emailResult.success) {
      console.log(`[ADMIN_NOTIFICATION] Pending approval notification sent to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}. Message: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
    } else {
      console.error(`[ADMIN_NOTIFICATION] Failed to send pending approval notification to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}. Reason: ${emailResult.message}`);
    }
  } catch (error) {
    console.error(`[ADMIN_NOTIFICATION] Error sending pending approval notification to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}:`, error);
  }
};

export const sendViolationDisputedToAdminsNotification = async (params: ViolationDisputedAdminNotificationParams) => {
  const { violation, adminUser, disputedBy, appUrl } = params;

  if (!adminUser.email) {
    console.warn(`[ADMIN_DISPUTE_NOTIFICATION_SKIP] Admin user ${adminUser.fullName} has no email address.`);
    return;
  }

  const subjects = await getEmailNotificationSubjects();
  const subject = subjects.violationDisputed;
  const violationDetailsLink = `${appUrl}/violations/${violation.uuid || violation.id}`;

  const textContent = `
Dear ${adminUser.fullName},

A violation has been disputed by the occupant and requires your review:

Violation Details:
- Reference Number: ${violation.referenceNumber}
- Type: ${violation.violationType}
- Unit Number: ${violation.unitNumber || 'N/A'}
- Disputed By: ${disputedBy}

The violation status has been changed to "Disputed" and is awaiting your decision to either approve or reject the violation based on the occupant's response.

Please review the dispute and any evidence provided:
${violationDetailsLink}

Thank you,
StrataGuard System
  `;

  const emailRequest: EmailRequest = {
    to: adminUser.email,
    subject,
    text: textContent,
    // html: "...", // TODO: Add HTML content using a template
    from: '"StrataGuard System" <notifications@strataguard.com>',
    emailType: 'system',
    metadata: {
      violationId: violation.id,
      violationUuid: violation.uuid,
      adminUserId: adminUser.id,
      recipientType: 'admin/council',
      action: 'dispute',
    },
    idempotencyKey: `violation-${violation.uuid || violation.id}-disputed-admin-${adminUser.id}`
  };

  try {
    const emailResult = await EmailDeduplicationService.sendEmailWithDeduplication(emailRequest);
    if (emailResult.success) {
      console.log(`[ADMIN_DISPUTE_NOTIFICATION] Dispute notification sent to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}. Message: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
    } else {
      console.error(`[ADMIN_DISPUTE_NOTIFICATION] Failed to send dispute notification to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}. Reason: ${emailResult.message}`);
    }
  } catch (error) {
    console.error(`[ADMIN_DISPUTE_NOTIFICATION] Error sending dispute notification to ${adminUser.fullName} (${adminUser.email}) for violation ${violation.id}:`, error);
  }
};

export const sendViolationRejectedToOccupantsNotification = async (params: ViolationRejectedOccupantNotificationParams) => {
  const { violation, rejectionReason, rejectedBy, personsToNotify } = params;

  const subjects = await getEmailNotificationSubjects();
  const subject = subjects.violationRejected;

  for (const person of personsToNotify) {
    if (person.receiveEmailNotifications && person.email) {
      const textContent = `
Dear ${person.fullName},

The violation reported for Unit ${violation.unitNumber || 'N/A'} has been reviewed and rejected by the strata council.

Violation Details:
- Reference Number: ${violation.referenceNumber}
- Type: ${violation.violationType}
- Unit Number: ${violation.unitNumber || 'N/A'}
- Rejected By: ${rejectedBy}

Reason for Rejection:
${rejectionReason}

This violation has been closed and no further action is required on your part. If you have any questions about this decision, please contact the strata council directly.

Thank you,
StrataGuard System
      `;

      const emailRequest: EmailRequest = {
        to: person.email,
        subject,
        text: textContent,
        // html: "...", // TODO: Add HTML content using a template
        from: '"StrataGuard System" <notifications@strataguard.com>',
        emailType: 'violation_notification',
        metadata: {
          violationId: violation.id,
          violationUuid: violation.uuid,
          personId: person.personId,
          recipientType: person.role,
          recipientEmail: person.email,
          action: 'rejection',
        },
        idempotencyKey: `violation-${violation.uuid || violation.id}-rejected-occupant-${person.personId}`
      };

      try {
        const emailResult = await EmailDeduplicationService.sendEmailWithDeduplication(emailRequest);
        if (emailResult.success) {
          console.log(`[VIOLATION_REJECTION_EMAIL] Rejection notification sent to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}. Message: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
        } else {
          console.error(`[VIOLATION_REJECTION_EMAIL] Failed to send rejection notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}. Reason: ${emailResult.message}`);
        }
      } catch (error) {
        console.error(`[VIOLATION_REJECTION_EMAIL] Error sending rejection notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}:`, error);
      }
    } else if (!person.receiveEmailNotifications) {
      console.log(`[VIOLATION_REJECTION_EMAIL] Skipping rejection notification for ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id} due to notification preferences.`);
    }
  }
};

export const sendViolationApprovedToOccupantsNotification = async (params: ViolationApprovedOccupantNotificationParams) => {
  const { violation, fineAmount, approvedBy, personsToNotify } = params;

  const subjects = await getEmailNotificationSubjects();
  const subject = subjects.violationApproval;

  for (const person of personsToNotify) {
    if (person.receiveEmailNotifications && person.email) {
      const textContent = `
Dear ${person.fullName},

The violation reported for Unit ${violation.unitNumber || 'N/A'} has been reviewed and approved by the strata council.

Violation Details:
- Reference Number: ${violation.referenceNumber}
- Type: ${violation.violationType}
- Unit Number: ${violation.unitNumber || 'N/A'}
- Fine Amount: $${fineAmount.toFixed(2)}
- Approved By: ${approvedBy}

This fine will be added to your strata fee account. Please ensure that the payment is made within 30 days to avoid additional penalties.

If you have any questions about this decision, please contact the strata council directly.

Thank you,
StrataGuard System
      `;

      const emailRequest: EmailRequest = {
        to: person.email,
        subject,
        text: textContent,
        // html: "...", // TODO: Add HTML content using a template
        from: '"StrataGuard System" <notifications@strataguard.com>',
        emailType: 'violation_approved',
        metadata: {
          violationId: violation.id,
          violationUuid: violation.uuid,
          personId: person.personId,
          recipientType: person.role,
          recipientEmail: person.email,
          fineAmount: fineAmount,
          action: 'approval',
        },
        idempotencyKey: `violation-${violation.uuid || violation.id}-approved-occupant-${person.personId}`
      };

      try {
        const emailResult = await EmailDeduplicationService.sendEmailWithDeduplication(emailRequest);
        if (emailResult.success) {
          console.log(`[VIOLATION_APPROVAL_EMAIL] Approval notification sent to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}. Message: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
        } else {
          console.error(`[VIOLATION_APPROVAL_EMAIL] Failed to send approval notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}. Reason: ${emailResult.message}`);
        }
      } catch (error) {
        console.error(`[VIOLATION_APPROVAL_EMAIL] Error sending approval notification to ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id}:`, error);
      }
    } else if (!person.receiveEmailNotifications) {
      console.log(`[VIOLATION_APPROVAL_EMAIL] Skipping approval notification for ${person.role} ${person.fullName} (${person.email}) for violation ${violation.id} due to notification preferences.`);
    }
  }
};

export { sendEmailWithDeduplication } from "./email-deduplication";

// Utility to format violation reference number as VIO-YYYYMMDD-XXX
export function formatViolationReferenceNumber(id: number, createdAt: Date): string {
  const datePart = new Date(createdAt).toISOString().slice(0, 10).replace(/-/g, '');
  const idPart = String(id).padStart(3, '0');
  return `VIO-${datePart}-${idPart}`;
}
