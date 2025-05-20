import nodemailer from 'nodemailer';
import { db } from './db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Email configuration types
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

// Default configuration - will be overridden by settings from database
let emailConfig: EmailConfig = {
  host: 'localhost',
  port: 25,
  secure: false,
  auth: {
    user: '',
    pass: ''
  },
  from: 'noreply@strataviolations.com'
};

// Initialize email transporter
let transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: emailConfig.auth.user ? emailConfig.auth : undefined,
  tls: {
    rejectUnauthorized: false
  }
});

// Load email settings from database
export async function loadEmailSettings(): Promise<EmailConfig | null> {
  try {
    const settings = await db.select().from(systemSettings)
      .where(eq(systemSettings.settingKey, 'email_config'));
    
    if (settings.length > 0) {
      try {
        const config = JSON.parse(settings[0].settingValue || '{}');
        
        // Validate the config has the required fields
        if (config.host && config.port && config.from) {
          emailConfig = {
            host: config.host,
            port: parseInt(config.port, 10),
            secure: config.secure === 'true' || config.secure === true,
            auth: {
              user: config.auth?.user || '',
              pass: config.auth?.pass || ''
            },
            from: config.from
          };
          
          // Update the transporter
          transporter = nodemailer.createTransport({
            host: emailConfig.host,
            port: emailConfig.port,
            secure: emailConfig.secure,
            auth: emailConfig.auth.user ? emailConfig.auth : undefined,
            tls: {
              rejectUnauthorized: false
            }
          });
          
          return emailConfig;
        }
      } catch (error) {
        console.error('Error parsing email config:', error);
      }
    }
    
    // Return default config if no setting found
    return {
      host: 'localhost',
      port: 25,
      secure: false,
      auth: {
        user: '',
        pass: ''
      },
      from: 'noreply@strataviolations.com'
    };
  } catch (error) {
    console.error('Error loading email settings:', error);
    
    // Return default config on error
    return {
      host: 'localhost',
      port: 25,
      secure: false,
      auth: {
        user: '',
        pass: ''
      },
      from: 'noreply@strataviolations.com'
    };
  }
}

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

// Send email function
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Load email settings
    const config = await loadEmailSettings();
    
    if (!config) {
      console.error('Email configuration not found');
      return false;
    }
    
    const mailOptions = {
      from: config.from,
      to: options.to,
      subject: options.subject,
      text: options.text || '',
      html: options.html || ''
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

// Verify email configuration by sending a test email
export async function verifyEmailConfig(config: EmailConfig, testEmail: string): Promise<boolean> {
  try {
    // Create a temporary transporter
    const tempTransporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.auth.user ? config.auth : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Send a test email
    const info = await tempTransporter.sendMail({
      from: config.from,
      to: testEmail,
      subject: 'SMTP Configuration Test',
      text: 'This is a test email to verify your SMTP configuration.',
      html: '<p>This is a test email to verify your SMTP configuration.</p>'
    });
    
    console.log('Test email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Error verifying email config:', error);
    return false;
  }
}

// Helper functions for user management

// Send welcome email with generated password
export async function sendWelcomeEmail(email: string, password: string, fullName: string): Promise<boolean> {
  const subject = 'Welcome to Strata Violation Management System';
  const html = `
    <h1>Welcome to Strata Violation Management System</h1>
    <p>Hello ${fullName},</p>
    <p>Your account has been created. You can log in with the following credentials:</p>
    <p><strong>Email:</strong> ${email}</p>
    <p><strong>Password:</strong> ${password}</p>
    <p>You will be required to change your password after your first login.</p>
    <p>Thank you,<br/>Strata Management Team</p>
  `;
  
  return sendEmail({
    to: email,
    subject,
    html
  });
}

// Send password reset email
export async function sendPasswordResetEmail(email: string, resetToken: string, req?: any): Promise<boolean> {
  let baseUrl = process.env.APP_URL;
  if (!baseUrl && req) {
    // Try to build from request headers
    const protocol = req.protocol || 'http';
    const host = req.get ? req.get('host') : (req.headers && req.headers.host);
    baseUrl = `${protocol}://${host}`;
  }
  if (!baseUrl) {
    baseUrl = 'http://localhost:5000';
  }
  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  const subject = 'Password Reset Request';
  const html = `
    <h1>Reset Your Password</h1>
    <p>You requested a password reset for your account. Please click the link below to reset your password:</p>
    <p><a href="${resetUrl}">Reset Password</a></p>
    <p>If you didn't request this, please ignore this email and your password will remain unchanged.</p>
    <p>This link will expire in 1 hour.</p>
    <p>Thank you,<br/>Strata Management Team</p>
  `;

  return sendEmail({
    to: email,
    subject,
    html
  });
}

// Initialize email settings
loadEmailSettings().catch(error => {
  console.error('Failed to load initial email settings:', error);
});