import nodemailer from 'nodemailer';

// Set up a testing transport if not in production
const transporter = process.env.NODE_ENV === "production" && process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  : nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.password',
      },
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

// For development, log emails instead of sending when using ethereal
const sendOrLog = async (mailOptions: nodemailer.SendMailOptions) => {
  try {
    if (process.env.NODE_ENV === "production" && process.env.SMTP_HOST) {
      const info = await transporter.sendMail(mailOptions);
      console.log(`Email sent: ${info.messageId}`);
      return info;
    } else {
      console.log("Email would be sent in production:");
      console.log("To:", mailOptions.to);
      console.log("Subject:", mailOptions.subject);
      console.log("Text:", mailOptions.text);
      return { messageId: "dev-mode" };
    }
  } catch (error) {
    console.error("Error sending email:", error);
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
  await sendOrLog({
    from: '"StrataGuard System" <notifications@strataguard.com>',
    to: ownerEmail,
    subject,
    text,
  });

  // Send to tenant if provided
  if (tenantEmail && tenantName) {
    await sendOrLog({
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

  await sendOrLog({
    from: '"StrataGuard System" <notifications@strataguard.com>',
    to: ownerEmail,
    subject,
    text,
  });
};
