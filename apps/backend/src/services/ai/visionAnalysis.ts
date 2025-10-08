/*
 * Vision Analysis Service
 * Uses AI vision models to analyze logos and provide intelligent suggestions
 *
 * Option 1: OpenAI GPT-4V (pros: high quality, reliable; cons: cost)
 * Option 2: Open-source CLIP/BLIP (pros: free; cons: needs infrastructure)
 * Chosen: GPT-4V for MVP with quality insights
 */

import { aiService, AIRequest } from './aiService';
import { aiConfig } from '../../config/ai';

export interface LogoAnalysisRequest {
  imageBuffer: Buffer;
  format: 'png' | 'svg';
  existingColors?: string[];
}

export interface LogoAnalysisResult {
  // Visual characteristics
  style: 'modern' | 'classic' | 'minimalist' | 'abstract' | 'tech' | 'playful';
  complexity: 'simple' | 'moderate' | 'complex';

  // Color insights
  suggestedPalettes: ColorPalette[];
  harmonicColors: string[];
  complementaryColors: string[];

  // Background recommendations
  backgroundStyles: BackgroundRecommendation[];

  // Logo characteristics
  hasTex: boolean;
  isSymmetric: boolean;
  dominantShape: 'circular' | 'rectangular' | 'triangular' | 'organic' | 'mixed';

  // Brand perception
  brandPersonality: string[];
  industry?: string;

  // Technical recommendations
  recommendations: string[];
}

export interface ColorPalette {
  name: string;
  colors: string[];
  description: string;
  useCase: string;
}

export interface BackgroundRecommendation {
  type: 'solid' | 'gradient' | 'pattern' | 'ai-generated';
  style: string;
  colors: string[];
  reasoning: string;
}

class VisionAnalysisService {
  /**
   * Analyze logo using AI vision model
   */
  async analyzeLogo(request: LogoAnalysisRequest): Promise<LogoAnalysisResult> {
    if (!aiConfig.openai.enabled) {
      throw new Error('OpenAI vision analysis is not enabled');
    }

    // Convert buffer to base64
    const base64Image = request.imageBuffer.toString('base64');
    const dataUrl = `data:image/${request.format};base64,${base64Image}`;

    // Build analysis prompt
    const prompt = this.buildAnalysisPrompt(request.existingColors);

    // Execute vision analysis
    const aiRequest: AIRequest = {
      provider: 'openai',
      operation: 'vision-analysis',
      params: {
        model: aiConfig.openai.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: aiConfig.openai.maxTokens,
      },
      cacheKey: `vision_${this.hashBuffer(request.imageBuffer)}`,
    };

    const response = await aiService.execute(aiRequest);

    if (!response.success || !response.data) {
      throw new Error(`Vision analysis failed: ${response.error}`);
    }

    // Parse structured response
    return this.parseAnalysisResponse(response.data);
  }

  /**
   * Suggest optimal color palettes based on logo
   */
  async suggestColorPalettes(
    logoBuffer: Buffer,
    format: 'png' | 'svg',
    context?: { industry?: string; mood?: string },
  ): Promise<ColorPalette[]> {
    const analysis = await this.analyzeLogo({
      imageBuffer: logoBuffer,
      format,
    });

    // Enhance with context if provided
    if (context?.industry || context?.mood) {
      return this.refinepalettesWithContext(analysis.suggestedPalettes, context);
    }

    return analysis.suggestedPalettes;
  }

  /**
   * Get background recommendations for logo
   */
  async getBackgroundRecommendations(
    logoBuffer: Buffer,
    format: 'png' | 'svg',
    _presetSize?: { width: number; height: number },
  ): Promise<BackgroundRecommendation[]> {
    const analysis = await this.analyzeLogo({
      imageBuffer: logoBuffer,
      format,
    });

    return analysis.backgroundStyles;
  }

  /**
   * Build comprehensive analysis prompt
   */
  private buildAnalysisPrompt(existingColors?: string[]): string {
    const colorContext = existingColors
      ? `\nExisting color palette: ${existingColors.join(', ')}`
      : '';

    return `Analyze this logo image and provide a structured JSON response with the following information:

1. Visual Style: Classify the logo's design style (modern, classic, minimalist, abstract, tech, playful)
2. Complexity: Rate complexity as simple, moderate, or complex
3. Color Palettes: Suggest 3-5 harmonious color palettes that would work well with this logo
4. Harmonic Colors: List 5-10 colors that harmonize with the logo's existing colors
5. Complementary Colors: List colors that would provide good contrast
6. Background Recommendations: Suggest 3-5 background styles with specific colors
7. Logo Characteristics:
   - Does it contain text?
   - Is it symmetric?
   - What's the dominant shape?
8. Brand Personality: List 3-5 brand personality traits this logo conveys
9. Industry: Suggest what industry this logo might belong to
10. Recommendations: Provide 3-5 specific recommendations for variant generation${colorContext}

Return ONLY valid JSON matching this structure:
{
  "style": "modern|classic|minimalist|abstract|tech|playful",
  "complexity": "simple|moderate|complex",
  "suggestedPalettes": [
    {
      "name": "string",
      "colors": ["#hex", "#hex", "#hex"],
      "description": "string",
      "useCase": "string"
    }
  ],
  "harmonicColors": ["#hex", "#hex"],
  "complementaryColors": ["#hex", "#hex"],
  "backgroundStyles": [
    {
      "type": "solid|gradient|pattern|ai-generated",
      "style": "string",
      "colors": ["#hex"],
      "reasoning": "string"
    }
  ],
  "hasText": boolean,
  "isSymmetric": boolean,
  "dominantShape": "circular|rectangular|triangular|organic|mixed",
  "brandPersonality": ["string"],
  "industry": "string",
  "recommendations": ["string"]
}`;
  }

  /**
   * Parse AI response into structured result
   */
  private parseAnalysisResponse(responseData: unknown): LogoAnalysisResult {
    try {
      // Extract JSON from response
      const content =
        (responseData as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]
          ?.message?.content || '';
      const jsonMatch = content.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        style: parsed.style || 'modern',
        complexity: parsed.complexity || 'moderate',
        suggestedPalettes: parsed.suggestedPalettes || [],
        harmonicColors: parsed.harmonicColors || [],
        complementaryColors: parsed.complementaryColors || [],
        backgroundStyles: parsed.backgroundStyles || [],
        hasText: parsed.hasText || false,
        isSymmetric: parsed.isSymmetric || false,
        dominantShape: parsed.dominantShape || 'mixed',
        brandPersonality: parsed.brandPersonality || [],
        industry: parsed.industry,
        recommendations: parsed.recommendations || [],
      };
    } catch (error) {
      console.error('Failed to parse vision analysis response:', error);

      // Return fallback structure
      return this.getFallbackAnalysis();
    }
  }

  /**
   * Refine palettes with additional context
   */
  private refinepalettesWithContext(
    palettes: ColorPalette[],
    context: { industry?: string; mood?: string },
  ): ColorPalette[] {
    // This could be enhanced with ML-based refinement
    // For now, just filter and prioritize based on context

    return palettes.map((palette) => ({
      ...palette,
      useCase: context.industry
        ? `${palette.useCase} - Optimized for ${context.industry}`
        : palette.useCase,
    }));
  }

  /**
   * Generate hash from buffer for caching
   */
  private hashBuffer(buffer: Buffer): string {
    // Lazy import to avoid top-level require
    const { createHash } = await import('node:crypto');
    return createHash('md5').update(buffer).digest('hex');
  }

  /**
   * Fallback analysis when AI fails
   */
  private getFallbackAnalysis(): LogoAnalysisResult {
    return {
      style: 'modern',
      complexity: 'moderate',
      suggestedPalettes: [
        {
          name: 'Default Palette',
          colors: ['#2563eb', '#7c3aed', '#db2777'],
          description: 'Modern vibrant colors',
          useCase: 'General purpose',
        },
      ],
      harmonicColors: ['#3b82f6', '#8b5cf6', '#ec4899'],
      complementaryColors: ['#f59e0b', '#10b981'],
      backgroundStyles: [
        {
          type: 'gradient',
          style: 'linear',
          colors: ['#2563eb', '#7c3aed'],
          reasoning: 'Default gradient recommendation',
        },
      ],
      hasText: false,
      isSymmetric: false,
      dominantShape: 'mixed',
      brandPersonality: ['professional', 'modern'],
      recommendations: ['Consider using gradient backgrounds', 'Try multiple aspect ratios'],
    };
  }
}

export const visionAnalysisService = new VisionAnalysisService();
