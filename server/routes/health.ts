import express from 'express';
import { storage as dbStorage } from '../storage';
import { getVirusScanner } from '../services/virusScanner';
import logger from '../utils/logger';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { supabaseKeepAlive } from '../services/supabase-keepalive';

const router = express.Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: {
    database: ServiceHealth;
    virusScanner: ServiceHealth;
    email: ServiceHealth;
    storage: ServiceHealth;
  };
  metrics: {
    memory: MemoryMetrics;
    cpu: CPUMetrics;
  };
}

interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

interface MemoryMetrics {
  heapUsed: string;
  heapTotal: string;
  external: string;
  rss: string;
}

interface CPUMetrics {
  userTime: number;
  systemTime: number;
}

// Detailed health check
router.get('/health/detailed', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: await checkDatabaseHealth(),
        virusScanner: await checkVirusScannerHealth(),
        email: await checkEmailHealth(),
        storage: await checkStorageHealth()
      },
      metrics: {
        memory: getMemoryMetrics(),
        cpu: getCPUMetrics()
      }
    };
    
    // Determine overall status
    const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
    if (serviceStatuses.includes('unhealthy')) {
      healthStatus.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(healthStatus);
    
    logger.info('[HEALTH] Detailed health check completed', {
      status: healthStatus.status,
      duration: Date.now() - startTime
    });
    
  } catch (error) {
    logger.error('[HEALTH] Health check failed', { error });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Simple readiness probe
router.get('/health/ready', async (req, res) => {
  try {
    // Quick database connectivity check
    const dbHealth = await checkDatabaseHealth();
    
    if (dbHealth.status === 'healthy') {
      res.status(200).json({ status: 'ready', timestamp: new Date().toISOString() });
    } else {
      res.status(503).json({ status: 'not_ready', reason: 'database_unavailable' });
    }
  } catch {
    res.status(503).json({ status: 'not_ready', reason: 'health_check_failed' });
  }
});

// Liveness probe
router.get('/health/live', (req, res) => {
  res.status(200).json({ 
    status: 'alive', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Database health check
async function checkDatabaseHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Test basic database operation
    await dbStorage.getAllSystemSettings();
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Virus scanner health check
async function checkVirusScannerHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const scanner = getVirusScanner();
    
    if (!scanner.isEnabled()) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: 'Virus scanning disabled',
        lastCheck: new Date().toISOString()
      };
    }
    
    if (!scanner.isReady()) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Virus scanner not ready',
        lastCheck: new Date().toISOString()
      };
    }
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Email service health check
async function checkEmailHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    // Check if email configuration exists
    const emailSetting = await dbStorage.getSystemSetting('email_config');
    
    if (!emailSetting) {
      return {
        status: 'degraded',
        responseTime: Date.now() - startTime,
        error: 'Email not configured',
        lastCheck: new Date().toISOString()
      };
    }
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Storage health check
async function checkStorageHealth(): Promise<ServiceHealth> {
  const startTime = Date.now();
  
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    // Check if uploads directory is accessible
    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.access(uploadsDir);
    
    return {
      status: 'healthy',
      responseTime: Date.now() - startTime,
      lastCheck: new Date().toISOString()
    };
  } catch (error: any) {
    return {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error.message,
      lastCheck: new Date().toISOString()
    };
  }
}

// Memory metrics
function getMemoryMetrics(): MemoryMetrics {
  const memUsage = process.memoryUsage();
  
  return {
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + 'MB',
    external: Math.round(memUsage.external / 1024 / 1024) + 'MB',
    rss: Math.round(memUsage.rss / 1024 / 1024) + 'MB'
  };
}

// CPU metrics
function getCPUMetrics(): CPUMetrics {
  const cpuUsage = process.cpuUsage();
  
  return {
    userTime: cpuUsage.user / 1000000, // Convert to seconds
    systemTime: cpuUsage.system / 1000000
  };
}

router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await db.execute(sql`SELECT 1`);
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (error as Error).message,
    });
  }
});

// Supabase keep-alive status endpoint
router.get('/supabase-keepalive', async (req, res) => {
  try {
    const stats = supabaseKeepAlive.getStats();
    res.status(200).json({
      status: 'success',
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
    });
  }
});

// Manual Supabase ping endpoint
router.post('/supabase-ping', async (req, res) => {
  try {
    const result = await supabaseKeepAlive.ping();
    res.status(200).json({
      status: 'success',
      data: result,
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: (error as Error).message,
    });
  }
});

export default router; 