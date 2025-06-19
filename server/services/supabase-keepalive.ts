import { supabase, supabaseAdmin } from '../supabase-client';
import cron, { ScheduledTask } from 'node-cron';

interface KeepAliveConfig {
  enabled: boolean;
  interval: string; // cron expression
  timeout: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

interface KeepAliveStats {
  lastPing: Date | null;
  consecutiveFailures: number;
  totalPings: number;
  totalFailures: number;
  isHealthy: boolean;
  lastError: string | null;
}

class SupabaseKeepAliveService {
  private config: KeepAliveConfig;
  private stats: KeepAliveStats;
  private cronJob: ScheduledTask | null = null;
  private isRunning = false;

  constructor() {
    this.config = {
      enabled: process.env.SUPABASE_KEEPALIVE_ENABLED === 'true' || true, // Default enabled
      interval: process.env.SUPABASE_KEEPALIVE_INTERVAL || '*/5 * * * *', // Every 5 minutes
      timeout: parseInt(process.env.SUPABASE_KEEPALIVE_TIMEOUT || '30000'), // 30 seconds
      retryAttempts: parseInt(process.env.SUPABASE_KEEPALIVE_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.SUPABASE_KEEPALIVE_RETRY_DELAY || '5000'), // 5 seconds
    };

    this.stats = {
      lastPing: null,
      consecutiveFailures: 0,
      totalPings: 0,
      totalFailures: 0,
      isHealthy: true,
      lastError: null,
    };
  }

  /**
   * Start the keep-alive service
   */
  start() {
    if (!this.config.enabled) {
      console.log('[SUPABASE_KEEPALIVE] Service disabled via configuration');
      return;
    }

    if (this.isRunning) {
      console.log('[SUPABASE_KEEPALIVE] Service already running');
      return;
    }

    console.log(`[SUPABASE_KEEPALIVE] Starting service with interval: ${this.config.interval}`);
    
    // Schedule the cron job
    this.cronJob = cron.schedule(this.config.interval, async () => {
      await this.performKeepAlive();
    }, {
      timezone: 'America/Vancouver' // Adjust to your timezone
    });

    if (this.cronJob) {
      this.cronJob.start();
    }
    this.isRunning = true;

    // Perform initial ping
    this.performKeepAlive();
  }

  /**
   * Stop the keep-alive service
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
    }
    this.isRunning = false;
    console.log('[SUPABASE_KEEPALIVE] Service stopped');
  }

  /**
   * Perform a keep-alive ping with retry logic
   */
  private async performKeepAlive(): Promise<void> {
    console.log('[SUPABASE_KEEPALIVE] Performing keep-alive ping...');
    
    let attempt = 0;
    let success = false;

    while (attempt < this.config.retryAttempts && !success) {
      attempt++;
      try {
        await this.pingDatabase();
        success = true;
        this.onSuccess();
      } catch (error) {
        console.error(`[SUPABASE_KEEPALIVE] Attempt ${attempt}/${this.config.retryAttempts} failed:`, error);
        
        if (attempt < this.config.retryAttempts) {
          console.log(`[SUPABASE_KEEPALIVE] Retrying in ${this.config.retryDelay}ms...`);
          await this.sleep(this.config.retryDelay);
        } else {
          this.onFailure(error as Error);
        }
      }
    }
  }

  /**
   * Ping the Supabase database with multiple connection tests
   */
  private async pingDatabase(): Promise<void> {
    const operations = [
      // Test 1: Basic auth health check
      this.testAuthConnection(),
      
      // Test 2: Database query (if you have access to profiles table)
      this.testDatabaseQuery(),
      
      // Test 3: Admin auth check
      this.testAdminConnection(),
    ];

    // Run all tests with timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Keep-alive timeout')), this.config.timeout);
    });

    await Promise.race([
      Promise.all(operations),
      timeoutPromise
    ]);
  }

  /**
   * Test basic auth connection
   */
  private async testAuthConnection(): Promise<void> {
    const { error } = await supabase.auth.getSession();
    if (error && error.message !== 'No session found') {
      throw new Error(`Auth connection failed: ${error.message}`);
    }
    console.log('[SUPABASE_KEEPALIVE] Auth connection test passed');
  }

  /**
   * Test database query
   */
  private async testDatabaseQuery(): Promise<void> {
    try {
      // Simple query to keep the database connection alive
      const { error } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .limit(1);

      if (error) {
        throw new Error(`Database query failed: ${error.message}`);
      }
      console.log('[SUPABASE_KEEPALIVE] Database query test passed');
    } catch {
      // If profiles table doesn't exist or is inaccessible, try a simpler auth check
      const { error: authError } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
      if (authError) {
        throw new Error(`Database connection failed: ${authError.message}`);
      }
      console.log('[SUPABASE_KEEPALIVE] Auth admin test passed (fallback)');
    }
  }

  /**
   * Test admin connection
   */
  private async testAdminConnection(): Promise<void> {
    const { error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 1 });
    if (error) {
      throw new Error(`Admin connection failed: ${error.message}`);
    }
    console.log('[SUPABASE_KEEPALIVE] Admin connection test passed');
  }

  /**
   * Handle successful ping
   */
  private onSuccess(): void {
    this.stats.lastPing = new Date();
    this.stats.totalPings++;
    this.stats.consecutiveFailures = 0;
    this.stats.isHealthy = true;
    this.stats.lastError = null;
    
    console.log(`[SUPABASE_KEEPALIVE] ✅ Keep-alive successful (Total: ${this.stats.totalPings})`);
  }

  /**
   * Handle failed ping
   */
  private onFailure(error: Error): void {
    this.stats.totalFailures++;
    this.stats.consecutiveFailures++;
    this.stats.lastError = error.message;
    this.stats.isHealthy = this.stats.consecutiveFailures < 3; // Consider unhealthy after 3 consecutive failures
    
    console.error(`[SUPABASE_KEEPALIVE] ❌ Keep-alive failed (Consecutive failures: ${this.stats.consecutiveFailures}):`, error.message);
    
    // Alert if database seems to be down
    if (this.stats.consecutiveFailures >= 3) {
      console.error(`[SUPABASE_KEEPALIVE] 🚨 Database appears to be unhealthy! (${this.stats.consecutiveFailures} consecutive failures)`);
    }
  }

  /**
   * Get current keep-alive statistics
   */
  getStats(): KeepAliveStats & { config: KeepAliveConfig; isRunning: boolean } {
    return {
      ...this.stats,
      config: this.config,
      isRunning: this.isRunning,
    };
  }

  /**
   * Manual ping for testing
   */
  async ping(): Promise<{ success: boolean; error?: string; duration: number }> {
    const startTime = Date.now();
    try {
      await this.pingDatabase();
      return { success: true, duration: Date.now() - startTime };
    } catch (error) {
      return { 
        success: false, 
        error: (error as Error).message, 
        duration: Date.now() - startTime 
      };
    }
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const supabaseKeepAlive = new SupabaseKeepAliveService(); 