import multer from 'multer';
import path from 'path';
import { randomUUID } from 'crypto';
import fs from 'fs/promises';
import { getVirusScanner } from '../services/virusScanner';
import logger from '../utils/logger';

// File type validation using magic numbers
const fileType = require('file-type');

interface SecurityValidationOptions {
  allowedMimeTypes: string[];
  allowedExtensions: string[];
  maxFileSize: number;
  enableVirusScanning: boolean;
  enableDeepValidation: boolean;
}

const DEFAULT_OPTIONS: SecurityValidationOptions = {
  allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf'],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  enableVirusScanning: process.env.VIRUS_SCANNING_ENABLED === 'true',
  enableDeepValidation: true,
};

// Enhanced file filter with multiple validation layers
const createSecureFileFilter = (options: SecurityValidationOptions) => {
  return (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    try {
      // Basic MIME type validation
      if (!options.allowedMimeTypes.includes(file.mimetype)) {
        logger.warn(`[FileUpload] Rejected file with MIME type: ${file.mimetype}`);
        return cb(new Error(`Invalid MIME type: ${file.mimetype}. Allowed types: ${options.allowedMimeTypes.join(', ')}`));
      }

      // File extension validation
      const ext = path.extname(file.originalname).toLowerCase();
      if (!options.allowedExtensions.includes(ext)) {
        logger.warn(`[FileUpload] Rejected file with extension: ${ext}`);
        return cb(new Error(`Invalid file extension: ${ext}. Allowed extensions: ${options.allowedExtensions.join(', ')}`));
      }

      // File name validation (prevent path traversal)
      if (file.originalname.includes('..') || /[\/\\:]/.test(file.originalname)) {
        logger.warn(`[FileUpload] Rejected file with suspicious name: ${file.originalname}`);
        return cb(new Error('Invalid file name: contains path traversal or invalid characters'));
      }

      // File name length validation
      if (file.originalname.length > 255) {
        logger.warn(`[FileUpload] Rejected file with long name: ${file.originalname.length} characters`);
        return cb(new Error('File name too long (max 255 characters)'));
      }

      cb(null, true);
    } catch (error) {
      logger.error('[FileUpload] File filter error:', error);
      cb(new Error('Could not validate file'));
    }
  };
};

// Deep content validation using buffer analysis
const validateFileContent = async (buffer: Buffer, originalName: string, expectedMimeType: string): Promise<void> => {
  try {
    // Detect actual file type from buffer
    const detectedType = await fileType.fromBuffer(buffer);
    
    if (!detectedType) {
      throw new Error('Unable to determine file type from content');
    }

    // Verify that detected type matches expected MIME type
    if (detectedType.mime !== expectedMimeType) {
      logger.warn(`[FileUpload] MIME type mismatch for ${originalName}: declared=${expectedMimeType}, detected=${detectedType.mime}`);
      throw new Error(`File content does not match declared type. Expected: ${expectedMimeType}, Detected: ${detectedType.mime}`);
    }

    // Additional security checks for specific file types
    await performTypeSpecificValidation(buffer, detectedType.mime, originalName);
    
    logger.debug(`[FileUpload] Content validation passed for ${originalName} (${detectedType.mime})`);
  } catch (error: any) {
    logger.error(`[FileUpload] Content validation failed for ${originalName}:`, error.message);
    throw error;
  }
};

// Type-specific validation for enhanced security
const performTypeSpecificValidation = async (buffer: Buffer, mimeType: string, filename: string): Promise<void> => {
  if (mimeType.startsWith('image/')) {
    await validateImageFile(buffer, filename);
  } else if (mimeType === 'application/pdf') {
    await validatePdfFile(buffer, filename);
  }
};

// Image-specific validation
const validateImageFile = async (buffer: Buffer, filename: string): Promise<void> => {
  try {
    // Check for suspicious patterns in image files
    const bufferString = buffer.toString('binary');
    
    // Detect potential embedded scripts or suspicious content
    const suspiciousPatterns = [
      /<script/i,
      /<\?php/i,
      /<%/,
      /javascript:/i,
      /vbscript:/i,
      /data:text\/html/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(bufferString)) {
        throw new Error(`Suspicious content detected in image file: ${filename}`);
      }
    }

    // Check file size consistency
    if (buffer.length < 100) {
      throw new Error('Image file too small to be valid');
    }

    logger.debug(`[FileUpload] Image validation passed for ${filename}`);
  } catch (error: any) {
    logger.warn(`[FileUpload] Image validation failed for ${filename}:`, error.message);
    throw error;
  }
};

// PDF-specific validation
const validatePdfFile = async (buffer: Buffer, filename: string): Promise<void> => {
  try {
    // Basic PDF structure validation
    const pdfHeader = buffer.slice(0, 4).toString();
    if (pdfHeader !== '%PDF') {
      throw new Error('Invalid PDF file structure');
    }

    // Check for suspicious JavaScript or embedded content
    const pdfContent = buffer.toString('binary');
    const suspiciousPatterns = [
      /\/JavaScript/i,
      /\/JS/i,
      /\/OpenAction/i,
      /\/Launch/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(pdfContent)) {
        logger.warn(`[FileUpload] Suspicious PDF content detected in ${filename}`);
        // Note: This might be too restrictive for legitimate PDFs with JavaScript
        // Consider logging and monitoring rather than blocking
      }
    }

    logger.debug(`[FileUpload] PDF validation passed for ${filename}`);
  } catch (error: any) {
    logger.warn(`[FileUpload] PDF validation failed for ${filename}:`, error.message);
    throw error;
  }
};

// Virus scanning middleware
const virusScanMiddleware = async (req: any, res: any, next: any) => {
  const scanner = getVirusScanner();
  
  if (!scanner.isEnabled()) {
    logger.debug('[FileUpload] Virus scanning disabled, skipping');
    return next();
  }

  if (!scanner.isReady()) {
    logger.error('[FileUpload] Virus scanner not ready');
    return res.status(503).json({
      error: 'Virus scanner unavailable',
      message: 'File scanning service is temporarily unavailable. Please try again later.'
    });
  }

  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      if (file.path) {
        // Scan file on disk
        const scanResult = await scanner.scanFile(file.path);
        if (!scanResult.isClean) {
          logger.warn(`[FileUpload] Virus detected in uploaded file: ${file.originalname}`, scanResult.threats);
          return res.status(403).json({
            error: 'Malware detected',
            message: 'The uploaded file contains malware and has been rejected.',
            threats: scanResult.threats
          });
        }
      } else if (file.buffer) {
        // Scan buffer content
        const scanResult = await scanner.scanBuffer(file.buffer, file.originalname);
        if (!scanResult.isClean) {
          logger.warn(`[FileUpload] Virus detected in uploaded buffer: ${file.originalname}`, scanResult.threats);
          return res.status(403).json({
            error: 'Malware detected',
            message: 'The uploaded file contains malware and has been rejected.',
            threats: scanResult.threats
          });
        }
      }
    }

    logger.debug(`[FileUpload] Virus scan completed for ${files.length} file(s)`);
    next();
  } catch (error: any) {
    logger.error('[FileUpload] Virus scanning error:', error);
    return res.status(500).json({
      error: 'Scan failed',
      message: 'An error occurred while scanning the file. Please try again.'
    });
  }
};

// Content validation middleware
const contentValidationMiddleware = async (req: any, res: any, next: any) => {
  try {
    const files = req.files || (req.file ? [req.file] : []);
    
    for (const file of files) {
      if (file.buffer) {
        await validateFileContent(file.buffer, file.originalname, file.mimetype);
      } else if (file.path) {
        // Read file and validate content
        const buffer = await fs.readFile(file.path);
        await validateFileContent(buffer, file.originalname, file.mimetype);
      }
    }

    logger.debug(`[FileUpload] Content validation completed for ${files.length} file(s)`);
    next();
  } catch (error: any) {
    logger.warn('[FileUpload] Content validation failed:', error.message);
    return res.status(400).json({
      error: 'Invalid file content',
      message: error.message
    });
  }
};

// Create secure multer configuration
export const createSecureUpload = (options: Partial<SecurityValidationOptions> = {}) => {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  // Create uploads directory if it doesn't exist
  const uploadsDir = path.join(process.cwd(), 'uploads');
  
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
      const ext = path.extname(file.originalname);
      const filename = `${randomUUID()}${ext}`;
      cb(null, filename);
    }
  });

  const upload = multer({
    storage,
    limits: {
      fileSize: config.maxFileSize,
      files: 5, // Maximum 5 files per request
    },
    fileFilter: createSecureFileFilter(config)
  });

  return {
    upload,
    virusScanMiddleware,
    contentValidationMiddleware,
    config
  };
};

// Helper function to clean up uploaded files on error
export const cleanupUploadedFiles = async (files: Express.Multer.File[]) => {
  for (const file of files) {
    if (file.path) {
      try {
        await fs.unlink(file.path);
        logger.debug(`[FileUpload] Cleaned up file: ${file.path}`);
      } catch (error) {
        logger.warn(`[FileUpload] Failed to cleanup file ${file.path}:`, error);
      }
    }
  }
};

export { DEFAULT_OPTIONS as DEFAULT_SECURITY_OPTIONS }; 