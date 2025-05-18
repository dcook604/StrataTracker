import nodemailer from 'nodemailer';
import { loadEmailSettings } from './email-service';

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
interface ViolationNotificationParams {
  violationId: number;
  unitNumber: string;
  violationType: string;
  ownerEmail: string;
  ownerName: string;
  tenantEmail?: string;
  tenantName?: string;
  reporterName: string;
}

// Interface for violation approved notification
interface ViolationApprovedParams {
  violationId: number;
  unitNumber: string;
  violationType: string;
  ownerEmail: string;
  ownerName: string;
  fineAmount: number;
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
  } = params;

  // Base email content
  const subject = `[StrataGuard] New Violation Report for Unit ${unitNumber}`;
  const text = `
    Dear ${ownerName},

    A new violation has been reported for Unit ${unitNumber}.

    Violation Details:
    - Violation ID: ${violationId}
    - Type: ${violationType}
    - Reported by: ${reporterName}

    You have 30 days to respond to this violation. If you would like to dispute this violation, 
    please log in to the StrataGuard system and submit your response.

    If no response is received within 30 days, this violation will be automatically approved by the strata council
    and a fine may be levied as per the strata bylaws.

    Thank you,
    StrataGuard System
  `;

  // Send to owner
  await sendEmail({
    from: '"StrataGuard System" <notifications@strataguard.com>',
    to: ownerEmail,
    subject,
    text,
  });

  // Send to tenant if provided
  if (tenantEmail && tenantName) {
    await sendEmail({
      from: '"StrataGuard System" <notifications@strataguard.com>',
      to: tenantEmail,
      subject,
      text: text.replace(ownerName, tenantName),
    });
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
    with your next strata fee payment.

    If you have any questions, please contact the strata council.

    Thank you,
    StrataGuard System
  `;

  await sendEmail({
    from: '"StrataGuard System" <notifications@strataguard.com>',
    to: ownerEmail,
    subject,
    text,
  });
};
