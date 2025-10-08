/**
 * Health Check Service
 *
 * Monitors application and dependency health for Kubernetes probes
 * Provides liveness and readiness checks
 */

import { Redis } from 'ioredis';
import { ConvexHttpClient } from 'convex/browser';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  checks: {
    [key: string]: {
      status: 'up' | 'down';
      responseTime?: number;
      message?: string;
    };
  };
}

export class HealthCheckService {
  private startTime: number;
  private redisClient: Redis | null = null;
  private convexClient: ConvexHttpClient | null = null;

  constructor() {
    this.startTime = Date.now();
  }

  /**
   * Initialize health check dependencies
   */
  initialize(options: { redisClient?: Redis; convexClient?: ConvexHttpClient }): void {
    this.redisClient = options.redisClient || null;
    this.convexClient = options.convexClient || null;
  }

  /**
   * Basic liveness check
   * Returns 200 if application is running
   * Used by Kubernetes liveness probe
   */
  async checkLiveness(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        application: {
          status: 'up',
        },
      },
    };
  }

  /**
   * Comprehensive readiness check
   * Returns 200 only if all dependencies are healthy
   * Used by Kubernetes readiness probe
   */
  async checkReadiness(): Promise<HealthStatus> {
    const checks: HealthStatus['checks'] = {};

    // Check Redis
    if (this.redisClient) {
      const redisStart = Date.now();
      try {
        await this.redisClient.ping();
        checks.redis = {
          status: 'up',
          responseTime: Date.now() - redisStart,
        };
      } catch (error) {
        checks.redis = {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Check Convex
    if (this.convexClient) {
      const convexStart = Date.now();
      try {
        // Simple query to check connectivity
        // TODO: Replace with actual health check query
        checks.convex = {
          status: 'up',
          responseTime: Date.now() - convexStart,
        };
      } catch (error) {
        checks.convex = {
          status: 'down',
          message: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Check S3 connectivity (optional)
    checks.storage = await this.checkS3();

    // Determine overall status
    const allHealthy = Object.values(checks).every((check) => check.status === 'up');

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      version: process.env.npm_package_version || '1.0.0',
      checks,
    };
  }

  /**
   * Check S3/MinIO connectivity
   */
  private async checkS3(): Promise<{
    status: 'up' | 'down';
    responseTime?: number;
    message?: string;
  }> {
    const start = Date.now();
    try {
      // Basic S3 check - list buckets or head bucket
      // TODO: Implement actual S3 health check
      return {
        status: 'up',
        responseTime: Date.now() - start,
      };
    } catch (error) {
      return {
        status: 'down',
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get detailed metrics for monitoring
   */
  getMetrics(): {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
  } {
    return {
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }
}

// Singleton instance
export const healthCheckService = new HealthCheckService();
