/**
 * Prometheus Metrics Service
 *
 * Collects and exposes application metrics for monitoring
 * Includes HTTP metrics, business metrics, and system metrics
 */

import { Registry, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

export class MetricsService {
  private registry: Registry;

  // HTTP Metrics
  public httpRequestDuration: Histogram;
  public httpRequestTotal: Counter;
  public httpRequestErrors: Counter;

  // Business Metrics
  public logoUploads: Counter;
  public jobsCreated: Counter;
  public jobsCompleted: Counter;
  public jobsFailed: Counter;
  public apiKeysCreated: Counter;
  public webhookDeliveries: Counter;
  public webhookFailures: Counter;

  // System Metrics
  public activeConnections: Gauge;
  public queueSize: Gauge;

  constructor() {
    this.registry = new Registry();

    // Collect default Node.js metrics (CPU, memory, etc.)
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'logomorph_',
    });

    // HTTP Request Duration
    this.httpRequestDuration = new Histogram({
      name: 'logomorph_http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.registry],
    });

    // HTTP Request Total
    this.httpRequestTotal = new Counter({
      name: 'logomorph_http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.registry],
    });

    // HTTP Request Errors
    this.httpRequestErrors = new Counter({
      name: 'logomorph_http_errors_total',
      help: 'Total number of HTTP errors',
      labelNames: ['method', 'route', 'error_type'],
      registers: [this.registry],
    });

    // Logo Uploads
    this.logoUploads = new Counter({
      name: 'logomorph_logo_uploads_total',
      help: 'Total number of logo uploads',
      labelNames: ['format', 'status'],
      registers: [this.registry],
    });

    // Jobs Created
    this.jobsCreated = new Counter({
      name: 'logomorph_jobs_created_total',
      help: 'Total number of jobs created',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Jobs Completed
    this.jobsCompleted = new Counter({
      name: 'logomorph_jobs_completed_total',
      help: 'Total number of jobs completed',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // Jobs Failed
    this.jobsFailed = new Counter({
      name: 'logomorph_jobs_failed_total',
      help: 'Total number of jobs failed',
      labelNames: ['type', 'reason'],
      registers: [this.registry],
    });

    // API Keys Created
    this.apiKeysCreated = new Counter({
      name: 'logomorph_api_keys_created_total',
      help: 'Total number of API keys created',
      registers: [this.registry],
    });

    // Webhook Deliveries
    this.webhookDeliveries = new Counter({
      name: 'logomorph_webhook_deliveries_total',
      help: 'Total number of webhook delivery attempts',
      labelNames: ['event', 'status'],
      registers: [this.registry],
    });

    // Webhook Failures
    this.webhookFailures = new Counter({
      name: 'logomorph_webhook_failures_total',
      help: 'Total number of webhook delivery failures',
      labelNames: ['event'],
      registers: [this.registry],
    });

    // Active Connections
    this.activeConnections = new Gauge({
      name: 'logomorph_active_connections',
      help: 'Number of active connections',
      registers: [this.registry],
    });

    // Queue Size
    this.queueSize = new Gauge({
      name: 'logomorph_queue_size',
      help: 'Number of jobs in queue',
      labelNames: ['queue'],
      registers: [this.registry],
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return await this.registry.metrics();
  }

  /**
   * Get content type for metrics endpoint
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.httpRequestTotal.inc({ method, route, status_code: statusCode });
    this.httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);

    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      this.httpRequestErrors.inc({ method, route, error_type: errorType });
    }
  }
}

// Singleton instance
export const metricsService = new MetricsService();
