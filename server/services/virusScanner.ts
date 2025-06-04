import { createRequire } from 'module';
import { promises as fs } from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const require = createRequire(import.meta.url);
const ClamScan = require('clamscan');

export interface ScanResult {
  isClean: boolean;
  threats?: string[];
  scanDuration?: number;
  fileSize?: number;
}

export interface ScannerConfig {
  enabled: boolean;
  removeInfected: boolean;
  maxFileSize: number; // in bytes
  scanTimeout: number; // in milliseconds
}

class VirusScannerService {
  private clamscan: any = null;
  private isInitialized: boolean = false;
  private config: ScannerConfig;

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = {
      enabled: process.env.VIRUS_SCANNING_ENABLED === 'true',
      removeInfected: true,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      scanTimeout: 60000, // 60 seconds
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('[VirusScanner] Virus scanning disabled by configuration');
      return;
    }

    try {
      this.clamscan = await new ClamScan().init({
        removeInfected: this.config.removeInfected,
        quarantineInfected: false,
        scanLog: null,
        debugMode: process.env.NODE_ENV === 'development',
        fileList: null,
        scanRecursively: true,
        clamscan: {
          path: '/usr/bin/clamscan',
          db: null,
          scanArchives: true,
          maxFileSize: this.config.maxFileSize,
        },
        preference: 'clamdscan',
        clamdscan: {
          socket: '/var/run/clamav/clamd.ctl',
          timeout: this.config.scanTimeout,
          localFallback: true,
          path: '/usr/bin/clamdscan',
          configFile: null,
          multiscan: true,
          reloadDb: false,
        },
      });
      
      this.isInitialized = true;
      logger.info('[VirusScanner] ClamAV scanner initialized successfully');
    } catch (error: any) {
      if (error.message?.includes('virus database is empty')) {
        logger.error('[VirusScanner] ClamAV database not initialized. Run: sudo freshclam');
      } else if (error.code === 'ENOENT') {
        logger.error('[VirusScanner] ClamAV socket not found. Check if clamd is running');
      } else {
        logger.error('[VirusScanner] Initialization error:', error);
      }
      throw new Error(`Virus scanner initialization failed: ${error.message}`);
    }
  }

  async scanFile(filePath: string): Promise<ScanResult> {
    if (!this.config.enabled) {
      return { isClean: true };
    }

    if (!this.isInitialized) {
      throw new Error('Virus scanner not initialized');
    }

    const startTime = Date.now();
    
    try {
      // Check if file exists and get stats
      const stats = await fs.stat(filePath);
      
      if (stats.size > this.config.maxFileSize) {
        throw new Error(`File size (${stats.size} bytes) exceeds maximum allowed (${this.config.maxFileSize} bytes)`);
      }

      const { isInfected, viruses } = await this.clamscan.scanFile(filePath);
      const scanDuration = Date.now() - startTime;

      const result: ScanResult = {
        isClean: !isInfected,
        threats: isInfected ? viruses : undefined,
        scanDuration,
        fileSize: stats.size
      };

      if (isInfected) {
        logger.warn(`[VirusScanner] Malware detected in ${filePath}:`, viruses);
        
        // Optionally remove infected file
        if (this.config.removeInfected) {
          await fs.unlink(filePath);
          logger.info(`[VirusScanner] Removed infected file: ${filePath}`);
        }
      } else {
        logger.debug(`[VirusScanner] File ${filePath} is clean (${scanDuration}ms)`);
      }

      return result;
    } catch (error: any) {
      const scanDuration = Date.now() - startTime;
      
      if (error.code === 'ENOENT') {
        throw new Error('File not found or ClamAV socket connection failed');
      }
      
      logger.error(`[VirusScanner] Scan error for ${filePath}:`, error);
      throw new Error(`Virus scan failed: ${error.message}`);
    }
  }

  async scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult> {
    if (!this.config.enabled) {
      return { isClean: true };
    }

    if (!this.isInitialized) {
      throw new Error('Virus scanner not initialized');
    }

    if (buffer.length > this.config.maxFileSize) {
      throw new Error(`Buffer size (${buffer.length} bytes) exceeds maximum allowed (${this.config.maxFileSize} bytes)`);
    }

    const startTime = Date.now();
    
    try {
      const { isInfected, viruses } = await this.clamscan.scanBuffer(buffer);
      const scanDuration = Date.now() - startTime;

      const result: ScanResult = {
        isClean: !isInfected,
        threats: isInfected ? viruses : undefined,
        scanDuration,
        fileSize: buffer.length
      };

      if (isInfected) {
        logger.warn(`[VirusScanner] Malware detected in buffer${filename ? ` (${filename})` : ''}:`, viruses);
      } else {
        logger.debug(`[VirusScanner] Buffer${filename ? ` (${filename})` : ''} is clean (${scanDuration}ms)`);
      }

      return result;
    } catch (error: any) {
      const scanDuration = Date.now() - startTime;
      logger.error(`[VirusScanner] Buffer scan error${filename ? ` (${filename})` : ''}:`, error);
      throw new Error(`Virus scan failed: ${error.message}`);
    }
  }

  async getVersion(): Promise<string | null> {
    if (!this.isInitialized) return null;
    
    try {
      return await this.clamscan.getVersion();
    } catch (error) {
      logger.error('[VirusScanner] Failed to get version:', error);
      return null;
    }
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  isReady(): boolean {
    return this.isInitialized && this.config.enabled;
  }
}

// Singleton instance
let virusScannerInstance: VirusScannerService | null = null;

export const getVirusScanner = (): VirusScannerService => {
  if (!virusScannerInstance) {
    virusScannerInstance = new VirusScannerService();
  }
  return virusScannerInstance;
};

export { VirusScannerService }; 