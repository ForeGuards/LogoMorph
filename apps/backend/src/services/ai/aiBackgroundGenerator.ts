/*
 * AI Background Generator Service
 * Uses AI models (Replicate/Stable Diffusion) to generate custom backgrounds
 *
 * Option 1: Replicate API (pros: no infrastructure; cons: cost, latency)
 * Option 2: Self-hosted Stable Diffusion (pros: control, cost; cons: infrastructure)
 * Option 3: Hybrid approach (pros: flexibility; cons: complexity)
 * Chosen: Hybrid with Replicate as primary and local SD as fallback
 */

import { aiService, AIRequest } from './aiService';
import { aiConfig } from '../../config/ai';
import sharp from 'sharp';

export interface AIBackgroundRequest {
  width: number;
  height: number;
  prompt: string;
  negativePrompt?: string;
  style?: 'realistic' | 'abstract' | 'gradient' | 'minimalist' | 'artistic';
  colors?: string[]; // Dominant colors to incorporate
  seed?: number;
}

export interface AIBackgroundResult {
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  prompt: string;
  cost: number;
  provider: string;
}

class AIBackgroundGenerator {
  /**
   * Generate AI background based on logo context
   */
  async generateBackground(request: AIBackgroundRequest): Promise<AIBackgroundResult> {
    // Build enhanced prompt
    const enhancedPrompt = this.buildPrompt(request);
    const negativePrompt = this.buildNegativePrompt(request);

    // Try Replicate first, fallback to Stable Diffusion
    let result: AIBackgroundResult;

    if (aiConfig.replicate.enabled) {
      result = await this.generateWithReplicate({
        ...request,
        prompt: enhancedPrompt,
        negativePrompt,
      });
    } else if (aiConfig.stableDiffusion.enabled) {
      result = await this.generateWithStableDiffusion({
        ...request,
        prompt: enhancedPrompt,
        negativePrompt,
      });
    } else {
      throw new Error('No AI background generation provider is configured');
    }

    // Resize if needed
    if (result.width !== request.width || result.height !== request.height) {
      const resized = await sharp(result.buffer)
        .resize(request.width, request.height, { fit: 'cover' })
        .png()
        .toBuffer();

      result.buffer = resized;
      result.width = request.width;
      result.height = request.height;
    }

    return result;
  }

  /**
   * Generate with Replicate API
   */
  private async generateWithReplicate(request: AIBackgroundRequest): Promise<AIBackgroundResult> {
    const aiRequest: AIRequest = {
      provider: 'replicate',
      operation: 'predict',
      params: {
        model: aiConfig.replicate.model,
        input: {
          prompt: request.prompt,
          negative_prompt: request.negativePrompt,
          width: request.width,
          height: request.height,
          num_outputs: 1,
          guidance_scale: 7.5,
          num_inference_steps: 30,
          seed: request.seed,
        },
      },
      cacheKey: this.getCacheKey(request),
    };

    const response = await aiService.execute(aiRequest);

    if (!response.success || !response.data) {
      throw new Error(`Replicate generation failed: ${response.error}`);
    }

    // Fetch image from URL
    const imageUrl = Array.isArray(response.data) ? response.data[0] : response.data;
    const imageResponse = await fetch(imageUrl);
    const buffer = Buffer.from(await imageResponse.arrayBuffer());

    return {
      buffer,
      width: request.width,
      height: request.height,
      format: 'png',
      prompt: request.prompt,
      cost: response.cost || 0.01, // Estimated cost per generation
      provider: 'replicate',
    };
  }

  /**
   * Generate with local Stable Diffusion
   */
  private async generateWithStableDiffusion(
    request: AIBackgroundRequest,
  ): Promise<AIBackgroundResult> {
    const aiRequest: AIRequest = {
      provider: 'stable-diffusion',
      operation: 'txt2img',
      params: {
        prompt: request.prompt,
        negative_prompt: request.negativePrompt,
        width: request.width,
        height: request.height,
        steps: aiConfig.stableDiffusion.steps,
        cfg_scale: aiConfig.stableDiffusion.guidance,
        seed: request.seed || -1,
      },
      cacheKey: this.getCacheKey(request),
    };

    const response = await aiService.execute(aiRequest);

    if (!response.success || !response.data) {
      throw new Error(`Stable Diffusion generation failed: ${response.error}`);
    }

    // SD API returns base64 image
    const buffer = Buffer.from(response.data.images[0], 'base64');

    return {
      buffer,
      width: request.width,
      height: request.height,
      format: 'png',
      prompt: request.prompt,
      cost: 0, // Free for self-hosted
      provider: 'stable-diffusion',
    };
  }

  /**
   * Build enhanced prompt from request
   */
  private buildPrompt(request: AIBackgroundRequest): string {
    const parts: string[] = [];

    // Base prompt
    parts.push(request.prompt);

    // Style modifiers
    const styleMap: Record<string, string> = {
      realistic: 'photorealistic, high detail, professional photography',
      abstract: 'abstract art, flowing shapes, artistic composition',
      gradient: 'smooth gradient, color transition, minimal design',
      minimalist: 'minimal, clean, simple design, flat colors',
      artistic: 'artistic style, creative composition, vibrant colors',
    };

    if (request.style && styleMap[request.style]) {
      parts.push(styleMap[request.style]);
    }

    // Color guidance
    if (request.colors && request.colors.length > 0) {
      const colorNames = request.colors.join(', ');
      parts.push(`color palette: ${colorNames}`);
    }

    // Quality modifiers
    parts.push('high quality, professional, suitable for logo background');

    return parts.join(', ');
  }

  /**
   * Build negative prompt to avoid unwanted elements
   */
  private buildNegativePrompt(request: AIBackgroundRequest): string {
    const defaults = [
      'text',
      'watermark',
      'signature',
      'logo',
      'words',
      'letters',
      'numbers',
      'low quality',
      'blurry',
      'pixelated',
    ];

    if (request.negativePrompt) {
      defaults.push(request.negativePrompt);
    }

    return defaults.join(', ');
  }

  /**
   * Generate cache key for request
   */
  private getCacheKey(request: AIBackgroundRequest): string {
    const key = `bg_${request.width}x${request.height}_${request.prompt}_${request.style || 'default'}`;
    return key.replace(/[^a-zA-Z0-9_]/g, '_').substring(0, 100);
  }

  /**
   * Generate background from logo analysis
   * Uses logo colors and style to create harmonious background
   */
  async generateFromLogoAnalysis(
    logoAnalysis: {
      colors: string[];
      style?: string;
      dominantColor: string;
    },
    width: number,
    height: number,
  ): Promise<AIBackgroundResult> {
    // Build context-aware prompt
    const style = this.inferStyleFromAnalysis(logoAnalysis);
    const prompt = this.buildLogoContextPrompt(logoAnalysis, style);

    return this.generateBackground({
      width,
      height,
      prompt,
      style,
      colors: logoAnalysis.colors,
    });
  }

  /**
   * Infer visual style from logo analysis
   */
  private inferStyleFromAnalysis(analysis: {
    style?: AIBackgroundRequest['style'];
    colors: string[];
  }): AIBackgroundRequest['style'] {
    // Simple heuristics (can be enhanced with ML)
    if (analysis.style) {
      return analysis.style;
    }

    // Default to gradient for most logos
    if (analysis.colors.length <= 2) {
      return 'minimalist';
    } else if (analysis.colors.length <= 4) {
      return 'gradient';
    } else {
      return 'artistic';
    }
  }

  /**
   * Build prompt from logo context
   */
  private buildLogoContextPrompt(
    analysis: { colors: string[]; dominantColor: string },
    style: AIBackgroundRequest['style'] | undefined,
  ): string {
    const prompts: Record<string, string> = {
      minimalist: 'clean minimal background, soft colors, professional',
      gradient: 'smooth flowing gradient, elegant color transition',
      abstract: 'abstract geometric shapes, modern design',
      artistic: 'creative artistic background, dynamic composition',
      realistic: 'subtle textured background, professional look',
    };

    return prompts[style] || prompts.gradient;
  }
}

export const aiBackgroundGenerator = new AIBackgroundGenerator();
