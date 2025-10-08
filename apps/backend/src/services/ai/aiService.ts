/*
 * Core AI Service
 * Provides abstraction layer for multiple AI providers
 * Handles rate limiting, retries, caching, and error handling
 *
 * Option 1: Direct provider calls (pros: simple; cons: no abstraction)
 * Option 2: Provider abstraction layer (pros: flexibility; cons: more complex)
 * Chosen: Abstraction layer for multi-provider support and easier testing
 */

import { aiConfig } from '../../config/ai';

export interface AIRequest {
  provider: 'openai' | 'replicate' | 'stable-diffusion';
  operation: string;
  params: Record<string, unknown>;
  cacheKey?: string;
}

export interface AIResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  cached?: boolean;
  cost?: number; // Estimated cost in USD
  duration?: number; // Milliseconds
}

export class AIServiceError extends Error {
  constructor(
    message: string,
    public provider: string,
    public code?: string,
    public retryable: boolean = false,
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

class AIService {
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private requestCount: Map<string, number> = new Map();
  private totalCost = 0;

  /**
   * Execute AI request with retry logic and caching
   */
  async execute<T>(request: AIRequest): Promise<AIResponse<T>> {
    const startTime = Date.now();

    try {
      // Check cache first
      if (request.cacheKey && aiConfig.enableCaching) {
        const cached = this.getFromCache(request.cacheKey);
        if (cached) {
          return {
            success: true,
            data: cached,
            cached: true,
            duration: Date.now() - startTime,
          };
        }
      }

      // Execute request with retries
      const config = this.getProviderConfig(request.provider);
      let lastError: Error | null = null;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
          const result = await this.executeRequest<T>(request, config.timeout);

          // Cache successful result
          if (request.cacheKey && aiConfig.enableCaching) {
            this.setCache(request.cacheKey, result.data);
          }

          // Track cost
          if (result.cost) {
            this.totalCost += result.cost;
          }

          return {
            ...result,
            duration: Date.now() - startTime,
          };
        } catch (error) {
          lastError = error as Error;

          if (attempt < config.maxRetries) {
            // Exponential backoff
            await this.delay(Math.pow(2, attempt) * 1000);
          }
        }
      }

      throw lastError;
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: err.message,
        duration: Date.now() - startTime,
      };
    }
  }

  /**
   * Execute the actual AI request
   */
  private async executeRequest<T>(request: AIRequest, timeout: number): Promise<AIResponse<T>> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      switch (request.provider) {
        case 'openai':
          return await this.executeOpenAI<T>(request, controller.signal);
        case 'replicate':
          return await this.executeReplicate<T>(request, controller.signal);
        case 'stable-diffusion':
          return await this.executeStableDiffusion<T>(request, controller.signal);
        default:
          throw new AIServiceError(
            `Unknown provider: ${request.provider}`,
            request.provider,
            'UNKNOWN_PROVIDER',
          );
      }
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Execute OpenAI request
   */
  private async executeOpenAI<T>(
    _request: AIRequest,
    _signal: AbortSignal,
  ): Promise<AIResponse<T>> {
    if (!aiConfig.openai.enabled || !aiConfig.openai.apiKey) {
      throw new AIServiceError('OpenAI is not configured', 'openai', 'NOT_CONFIGURED');
    }

    // Implementation will be added in vision service
    throw new AIServiceError('Not implemented', 'openai', 'NOT_IMPLEMENTED');
  }

  /**
   * Execute Replicate request
   */
  private async executeReplicate<T>(
    _request: AIRequest,
    _signal: AbortSignal,
  ): Promise<AIResponse<T>> {
    if (!aiConfig.replicate.enabled || !aiConfig.replicate.apiKey) {
      throw new AIServiceError('Replicate is not configured', 'replicate', 'NOT_CONFIGURED');
    }

    // Implementation will be added in background generator
    throw new AIServiceError('Not implemented', 'replicate', 'NOT_IMPLEMENTED');
  }

  /**
   * Execute Stable Diffusion request
   */
  private async executeStableDiffusion<T>(
    _request: AIRequest,
    _signal: AbortSignal,
  ): Promise<AIResponse<T>> {
    if (!aiConfig.stableDiffusion.enabled) {
      throw new AIServiceError(
        'Stable Diffusion is not configured',
        'stable-diffusion',
        'NOT_CONFIGURED',
      );
    }

    // Implementation will be added in background generator
    throw new AIServiceError('Not implemented', 'stable-diffusion', 'NOT_IMPLEMENTED');
  }

  /**
   * Get provider configuration
   */
  private getProviderConfig(provider: string) {
    switch (provider) {
      case 'openai':
        return aiConfig.openai;
      case 'replicate':
        return aiConfig.replicate;
      case 'stable-diffusion':
        return aiConfig.stableDiffusion;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  /**
   * Cache management
   */
  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > aiConfig.cacheExpiry * 1000) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  private setCache(key: string, data: unknown): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): number {
    let cleared = 0;
    const now = Date.now();

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > aiConfig.cacheExpiry * 1000) {
        this.cache.delete(key);
        cleared++;
      }
    }

    return cleared;
  }

  /**
   * Get service stats
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      totalCost: this.totalCost,
      requestCount: Array.from(this.requestCount.entries()),
    };
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const aiService = new AIService();
