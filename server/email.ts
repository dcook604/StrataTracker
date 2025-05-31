import nodemailer from 'nodemailer';
import { loadEmailSettings } from './email-service';
import { sendEmailWithDeduplication } from './email-deduplication';
import { db } from './db';
import { unitPersonRoles } from '../shared/schema';
import { and, eq } from 'drizzle-orm';

// Initialize with default local configuration
let transporter = nodemailer.createTransport({
  host: 'localhost',
  port: 25,
  secure: false,
  tls: {
    rejectUnauthorized: false
  }
});

// Interface for violation notification
export interface ViolationNotificationParams {
  violationId: number;
  unitNumber: string;
  violationType: string;
  ownerEmail: string;
  ownerName: string;
  tenantEmail?: string;
  tenantName?: string;
  reporterName: string;
  unitId: number;
  accessLinks?: { owner?: string; tenant?: string };
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

// Send notification when a new violation is reported
export const sendViolationNotification = async (params: ViolationNotificationParams) => {
  const {
    violationId,
    unitNumber,
    violationType,
    ownerEmail,
    ownerName,
    tenantEmail,
    tenantName,
    reporterName,
    unitId,
    accessLinks,
  } = params;

  // Base email content
  const subject = `[StrataGuard] New Violation Report for Unit ${unitNumber}`;
  const ownerLinkText = accessLinks?.owner ? `\nYou may respond directly using this secure link: ${accessLinks.owner}\n` : "";
  const text = `
    Dear ${ownerName},

    A new violation has been reported for Unit ${unitNumber}.

    Violation Details:
    - Violation ID: ${violationId}
    - Type: ${violationType}
    - Reported by: ${reporterName}

    You have 30 days to respond to this violation. If you would like to dispute this violation, you may:\n
    1. Log in to the StrataGuard system and submit your response, OR
    2. Use the secure link below to add a comment and upload evidence (photos, PDFs):
    ${ownerLinkText}

    If no response is received within 30 days, this violation will be automatically approved by the strata council and a fine may be levied as per the strata bylaws.

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
      emailType: 'violation_notification',
      metadata: {
        violationId,
        unitId,
        unitNumber,
        recipientType: 'owner',
        recipientEmail: ownerEmail
      }
    });

    console.log(`[VIOLATION_EMAIL] Owner notification for violation ${violationId}: ${emailResult.message} ${emailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
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
      const tenantLinkText = accessLinks?.tenant ? `\nYou may respond directly using this secure link: ${accessLinks.tenant}\n` : "";
      const tenantEmailResult = await sendEmailWithDeduplication({
        from: '"StrataGuard System" <notifications@strataguard.com>',
        to: tenantEmail,
        subject,
        text: text.replace(ownerName, tenantName) + tenantLinkText,
        emailType: 'violation_notification',
        metadata: {
          violationId,
          unitId,
          unitNumber,
          recipientType: 'tenant',
          recipientEmail: tenantEmail
        }
      });

      console.log(`[VIOLATION_EMAIL] Tenant notification for violation ${violationId}: ${tenantEmailResult.message} ${tenantEmailResult.isDuplicate ? '(duplicate prevented)' : ''}`);
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

  const subject = `[StrataGuard] Violation Approved for Unit ${unitNumber}`;
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
