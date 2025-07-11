import express from 'express';
import { storage as dbStorage } from '../storage.js';
import { verifyEmailConfig, EmailConfig } from '../email-service.js';

const router = express.Router();

// Check if user is authenticated and has admin privileges (FIXED for Supabase auth)
const isAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Check if user is authenticated
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required." });
  }
  
  // Use Supabase auth role property
  if (req.user.role === 'admin') {
    return next();
  }
  
  res.status(403).json({ message: "Forbidden - Admin access required" });
};

// Get email configuration
router.get('/', isAdmin, async (req, res) => {
  try {
    const setting = await dbStorage.getSystemSetting('email_config');
    
    if (!setting) {
      const defaultConfig = {
        host: 'localhost',
        port: 25,
        secure: false,
        auth: {
          user: '',
          pass: ''
        },
        from: 'noreply@strataviolations.com',
        fromName: 'Strata Management'
      };
      return res.json(defaultConfig);
    }
    
    // Parse the JSON value from settings
    const config = JSON.parse(setting.settingValue || '{}');
    
    // Don't return the actual password in the response
    if (config.auth && config.auth.pass) {
      config.auth.pass = '********';
    }
    
    res.json(config);
  } catch (error) {
    console.error('Error getting email config:', error);
    res.status(500).json({ message: 'Failed to get email configuration' });
  }
});

// Update email configuration
router.post('/', isAdmin, async (req, res) => {
  try {
    const { host, port, secure, auth, from, fromName } = req.body;
    
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "User not authenticated or user ID missing." });
    }

    if (!host || !port || !from) {
      return res.status(400).json({ message: 'Host, port and from address are required' });
    }
    
    const config: EmailConfig = {
      host,
      port: parseInt(port, 10),
      secure: !!secure,
      auth: {
        user: auth?.user || '',
        pass: auth?.pass || ''
      },
      from,
      fromName: fromName || 'Strata Management'
    };
    
    // If password is masked, get the current password from database
    if (auth?.pass === '********') {
      const currentSetting = await dbStorage.getSystemSetting('email_config');
      if (currentSetting && currentSetting.settingValue) {
        const currentConfig = JSON.parse(currentSetting.settingValue || '{}');
        if (currentConfig.auth && currentConfig.auth.pass) {
          config.auth.pass = currentConfig.auth.pass;
        }
      }
    }
    
    // Save configuration using the authenticated user's ID
    await dbStorage.updateSystemSetting(
      'email_config',
      JSON.stringify(config),
      req.user.id
    );
    
    res.json({ message: 'Email configuration updated successfully' });
  } catch (error) {
    console.error('Error updating email config:', error);
    res.status(500).json({ message: 'Failed to update email configuration' });
  }
});

// Test email configuration
router.post('/test', isAdmin, async (req, res) => {
  try {
    const { host, port, secure, auth, from, fromName, testEmail } = req.body;
    
    if (!host || !port || !from || !testEmail) {
      return res.status(400).json({ 
        message: 'Host, port, from address and test email address are required' 
      });
    }
    
    const config: EmailConfig = {
      host,
      port: parseInt(port, 10),
      secure: !!secure,
      auth: {
        user: auth?.user || '',
        pass: auth?.pass || ''
      },
      from,
      fromName: fromName || 'Strata Management'
    };
    
    // If password is masked, get the current password from database
    if (auth?.pass === '********') {
      const currentSetting = await dbStorage.getSystemSetting('email_config');
      if (currentSetting && currentSetting.settingValue) {
        const currentConfig = JSON.parse(currentSetting.settingValue || '{}');
        if (currentConfig.auth && currentConfig.auth.pass) {
          config.auth.pass = currentConfig.auth.pass;
        }
      }
    }
    
    // Test the email configuration
    const success = await verifyEmailConfig(config, testEmail);
    
    if (success) {
      res.json({ success: true, message: 'Email sent successfully' });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Failed to send test email. Please check your settings and try again.' 
      });
    }
  } catch (error) {
    console.error('Error testing email config:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error testing email configuration: ' + (error as Error).message 
    });
  }
});

export default router;