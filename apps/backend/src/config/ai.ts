/*
 * AI Service Configuration
 * Manages API keys, model settings, and cost controls for AI providers
 *
 * Option 1: Centralized config (pros: single source of truth; cons: can grow large)
 * Option 2: Per-provider configs (pros: modular; cons: scattered settings)
 * Chosen: Centralized with typed interfaces for maintainability
 */

export interface AIProviderConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  maxRetries: number;
  timeout: number; // milliseconds
}

export interface OpenAIConfig extends AIProviderConfig {
  model: string;
  maxTokens: number;
}

export interface ReplicateConfig extends AIProviderConfig {
  model: string;
  webhookUrl?: string;
}

export interface StableDiffusionConfig extends AIProviderConfig {
  model: string;
  steps: number;
  guidance: number;
}

export interface RemoveBgConfig extends AIProviderConfig {
  size: 'regular' | 'hd' | 'full';
}

export interface AIConfig {
  // Vision & Analysis
  openai: OpenAIConfig;

  // Image Generation
  replicate: ReplicateConfig;
  stableDiffusion: StableDiffusionConfig;

  // Background Removal
  removebg: RemoveBgConfig;

  // Cost controls
  maxCostPerJob: number; // USD
  monthlyBudget: number; // USD

  // Performance
  enableCaching: boolean;
  cacheExpiry: number; // seconds
}

// Load configuration from environment
export const aiConfig: AIConfig = {
  openai: {
    enabled: process.env.OPENAI_ENABLED === 'true',
    apiKey: process.env.OPENAI_API_KEY,
    baseUrl: process.env.OPENAI_BASE_URL,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000', 10),
    maxRetries: 3,
    timeout: 30000,
  },

  replicate: {
    enabled: process.env.REPLICATE_ENABLED === 'true',
    apiKey: process.env.REPLICATE_API_KEY,
    model: process.env.REPLICATE_MODEL || 'stability-ai/sdxl:latest',
    webhookUrl: process.env.REPLICATE_WEBHOOK_URL,
    maxRetries: 3,
    timeout: 120000, // 2 minutes for image generation
  },

  stableDiffusion: {
    enabled: process.env.SD_ENABLED === 'true',
    apiKey: process.env.SD_API_KEY,
    baseUrl: process.env.SD_BASE_URL || 'http://localhost:7860',
    model: process.env.SD_MODEL || 'sd_xl_base_1.0',
    steps: parseInt(process.env.SD_STEPS || '30', 10),
    guidance: parseFloat(process.env.SD_GUIDANCE || '7.5'),
    maxRetries: 2,
    timeout: 90000,
  },

  removebg: {
    enabled: process.env.REMOVEBG_ENABLED === 'true',
    apiKey: process.env.REMOVEBG_API_KEY,
    size: (process.env.REMOVEBG_SIZE as 'regular' | 'hd' | 'full') || 'regular',
    maxRetries: 3,
    timeout: 30000,
  },

  maxCostPerJob: parseFloat(process.env.AI_MAX_COST_PER_JOB || '1.0'),
  monthlyBudget: parseFloat(process.env.AI_MONTHLY_BUDGET || '100.0'),

  enableCaching: process.env.AI_ENABLE_CACHE !== 'false',
  cacheExpiry: parseInt(process.env.AI_CACHE_EXPIRY || '86400', 10), // 24 hours
};

// Validate required API keys
export function validateAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (aiConfig.openai.enabled && !aiConfig.openai.apiKey) {
    errors.push('OpenAI is enabled but OPENAI_API_KEY is not set');
  }

  if (aiConfig.replicate.enabled && !aiConfig.replicate.apiKey) {
    errors.push('Replicate is enabled but REPLICATE_API_KEY is not set');
  }

  if (aiConfig.stableDiffusion.enabled && !aiConfig.stableDiffusion.baseUrl) {
    errors.push('Stable Diffusion is enabled but SD_BASE_URL is not set');
  }

  if (aiConfig.removebg.enabled && !aiConfig.removebg.apiKey) {
    errors.push('Remove.bg is enabled but REMOVEBG_API_KEY is not set');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Get enabled AI features
export function getEnabledFeatures(): string[] {
  const features: string[] = [];

  if (aiConfig.openai.enabled) features.push('vision-analysis');
  if (aiConfig.replicate.enabled || aiConfig.stableDiffusion.enabled) {
    features.push('ai-backgrounds');
  }
  if (aiConfig.removebg.enabled) features.push('background-removal');

  return features;
}
