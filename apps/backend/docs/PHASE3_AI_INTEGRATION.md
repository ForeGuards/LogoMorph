# Phase 3: AI Integration & Advanced Features

## Overview

Phase 3 adds powerful AI capabilities to LogoMorph, enabling intelligent background generation, smart color palette suggestions, and automated logo analysis using state-of-the-art AI models.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  AI Service Layer                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   OpenAI     │  │  Replicate   │  │  Stable      │  │
│  │   GPT-4V     │  │     SDXL     │  │  Diffusion   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                  │                  │          │
│         └──────────────────┴──────────────────┘          │
│                            │                              │
│                   ┌────────▼────────┐                     │
│                   │   AI Service    │                     │
│                   │   (Abstraction) │                     │
│                   └────────┬────────┘                     │
│                            │                              │
│         ┌──────────────────┼──────────────────┐          │
│         │                  │                  │          │
│  ┌──────▼──────┐  ┌───────▼──────┐  ┌───────▼──────┐   │
│  │  Vision     │  │   Background │  │  Background  │   │
│  │  Analysis   │  │   Generator  │  │   Removal    │   │
│  └─────────────┘  └──────────────┘  └──────────────┘   │
│                                                           │
└───────────────────────────────────────────────────────────┘
```

## Features Implemented

### ✅ 1. Core AI Infrastructure

- **Provider Abstraction**: Unified interface for multiple AI services
- **Retry Logic**: Exponential backoff with configurable attempts
- **Caching**: Intelligent request caching to reduce costs
- **Error Handling**: Graceful degradation and fallback mechanisms
- **Cost Tracking**: Monitor API usage and spending

**Files**:

- `src/config/ai.ts` - Configuration management
- `src/services/ai/aiService.ts` - Core service layer

### ✅ 2. AI Background Generation

- **Stable Diffusion Integration**: Generate custom backgrounds using SDXL
- **Replicate API Support**: Cloud-based alternative with no infrastructure
- **Context-Aware Prompts**: Use logo colors and style for harmonious results
- **Style Options**: realistic, abstract, gradient, minimalist, artistic
- **Automatic Resizing**: Fit backgrounds to any preset dimensions

**Files**:

- `src/services/ai/aiBackgroundGenerator.ts`

**Usage Example**:

```typescript
import { aiBackgroundGenerator } from './services/ai/aiBackgroundGenerator';

const result = await aiBackgroundGenerator.generateBackground({
  width: 1600,
  height: 400,
  prompt: 'modern tech background',
  style: 'gradient',
  colors: ['#2563eb', '#7c3aed'],
});
```

### ✅ 3. Vision Analysis & Color Intelligence

- **GPT-4V Integration**: Analyze logos for style, complexity, and characteristics
- **Smart Color Palettes**: AI-suggested harmonious color combinations
- **Background Recommendations**: Context-aware background style suggestions
- **Brand Personality Detection**: Infer brand traits from visual design
- **Industry Recognition**: Suggest likely industry/sector

**Files**:

- `src/services/ai/visionAnalysis.ts`

**Usage Example**:

```typescript
import { visionAnalysisService } from './services/ai/visionAnalysis';

const analysis = await visionAnalysisService.analyzeLogo({
  imageBuffer: logoBuffer,
  format: 'png',
  existingColors: ['#2563eb'],
});

console.log(analysis.suggestedPalettes);
// [
//   {
//     name: "Modern Blue",
//     colors: ["#2563eb", "#7c3aed", "#db2777"],
//     description: "Vibrant modern palette",
//     useCase: "Tech and SaaS brands"
//   }
// ]
```

### ✅ 4. Configuration & Cost Management

- **Environment-Based Config**: Secure API key management
- **Feature Flags**: Enable/disable AI features independently
- **Cost Controls**: Per-job and monthly budget limits
- **Multiple Providers**: Switch between OpenAI, Replicate, self-hosted SD
- **Validation**: Startup checks for required credentials

## Setup Instructions

### 1. Install Additional Dependencies

```bash
cd apps/backend
bun add openai replicate
```

### 2. Configure Environment Variables

Copy the example file and fill in your API keys:

```bash
cp .env.example .env
```

Required configuration:

```bash
# For AI-generated backgrounds (choose one)
REPLICATE_ENABLED=true
REPLICATE_API_KEY=r8_your_key_here

# OR for self-hosted Stable Diffusion
SD_ENABLED=true
SD_BASE_URL=http://localhost:7860

# For vision analysis and color suggestions
OPENAI_ENABLED=true
OPENAI_API_KEY=sk-your_key_here
OPENAI_MODEL=gpt-4o
```

### 3. Set Up AI Providers

#### Option A: Replicate (Cloud-Based)

1. Sign up at [replicate.com](https://replicate.com)
2. Get your API token from account settings
3. Set `REPLICATE_API_KEY` in `.env`
4. Choose a model (default: `stability-ai/sdxl:latest`)

**Pros**: No infrastructure, fast setup, reliable
**Cons**: Pay per generation (~$0.01-0.02 per image)

#### Option B: Self-Hosted Stable Diffusion

1. Install Stable Diffusion WebUI or ComfyUI
2. Enable API mode (`--api` flag for AUTOMATIC1111)
3. Set `SD_BASE_URL` to your instance
4. Configure model and parameters

**Pros**: Free after setup, full control
**Cons**: Requires GPU, infrastructure management

#### Option C: OpenAI for Vision Analysis

1. Sign up at [platform.openai.com](https://platform.openai.com)
2. Create an API key
3. Set `OPENAI_API_KEY` in `.env`
4. Use GPT-4V model (`gpt-4o` or `gpt-4-vision-preview`)

**Cost**: ~$0.01-0.03 per logo analysis

### 4. Validate Configuration

Start the backend and check logs:

```bash
bun --hot src/server.ts
```

You should see:

```
✓ AI services configured
  - OpenAI: enabled (gpt-4o)
  - Replicate: enabled (stability-ai/sdxl)
  - Cache: enabled (24h expiry)
```

## API Integration

### Using AI Backgrounds in Variant Generation

Update your variant generation request to use AI backgrounds:

```typescript
POST /api/jobs/generate-variants
{
  "logoId": "logo_123",
  "presets": ["Website Header", "Social Square"],
  "backgroundType": "ai-generated",
  "aiBackgroundPrompt": "modern tech gradient",
  "aiBackgroundStyle": "gradient"
}
```

### Getting Logo Analysis

```typescript
POST /api/logos/:id/analyze
{
  "features": ["colors", "style", "recommendations"]
}

// Response:
{
  "style": "modern",
  "complexity": "simple",
  "suggestedPalettes": [...],
  "backgroundRecommendations": [...],
  "brandPersonality": ["professional", "innovative", "trustworthy"]
}
```

## Cost Estimates

### OpenAI GPT-4V

- **Vision Analysis**: $0.01-0.03 per logo
- **Use Case**: Logo analysis, color suggestions
- **Monthly estimate**: ~$10-30 for 500 logos

### Replicate SDXL

- **Background Generation**: $0.01-0.02 per image
- **Use Case**: Custom AI backgrounds
- **Monthly estimate**: ~$20-40 for 1000 backgrounds

### Self-Hosted Stable Diffusion

- **Initial Cost**: GPU hardware or cloud instance
- **Running Cost**: ~$0.50-2/hour for GPU instance
- **Use Case**: High-volume generation
- **Break-even**: ~1000+ images/month

## Performance Considerations

### Caching Strategy

- AI responses are cached for 24 hours by default
- Cache key includes: image hash, prompt, model parameters
- Cache hit rate typically 30-50% for recurring requests

### Processing Times

- **Vision Analysis**: 2-5 seconds
- **AI Background (Replicate)**: 10-30 seconds
- **AI Background (Self-hosted)**: 5-15 seconds
- **Background Removal**: 1-3 seconds

### Rate Limits

- **OpenAI**: 500 requests/min (tier 2)
- **Replicate**: 100 concurrent predictions
- **Self-hosted**: Depends on hardware

## Best Practices

### 1. Enable Caching

```typescript
AI_ENABLE_CACHE=true
AI_CACHE_EXPIRY=86400  # 24 hours
```

### 2. Set Budget Limits

```typescript
AI_MAX_COST_PER_JOB = 1.0;
AI_MONTHLY_BUDGET = 100.0;
```

### 3. Use Feature Flags

```typescript
FEATURE_AI_BACKGROUNDS=true      # Enable selectively
FEATURE_VISION_ANALYSIS=false    # Can disable expensive features
```

### 4. Fallback Strategy

```typescript
// Service automatically falls back:
// 1. Try Replicate (if enabled)
// 2. Try Stable Diffusion (if enabled)
// 3. Use traditional gradient backgrounds
```

### 5. Monitor Costs

```typescript
import { aiService } from './services/ai/aiService';

const stats = aiService.getStats();
console.log(`Total AI cost: $${stats.totalCost.toFixed(2)}`);
```

## Troubleshooting

### "OpenAI is not configured"

- Check `OPENAI_ENABLED=true` in `.env`
- Verify `OPENAI_API_KEY` is set correctly
- Test with: `curl https://api.openai.com/v1/models -H "Authorization: Bearer $OPENAI_API_KEY"`

### "Replicate generation failed"

- Verify API key is valid
- Check model name matches available models
- Review Replicate dashboard for quota/billing issues

### "Stable Diffusion connection refused"

- Ensure SD WebUI is running with `--api` flag
- Check `SD_BASE_URL` points to correct endpoint
- Test with: `curl http://localhost:7860/sdapi/v1/sd-models`

### High Costs / Budget Exceeded

- Review `aiService.getStats()` to identify expensive operations
- Enable caching if disabled
- Reduce `AI_MAX_COST_PER_JOB` limit
- Consider self-hosted SD for high volume

## Next Steps (Phase 3 Continued)

### 🔄 In Progress

- [ ] Background removal integration (Remove.bg)
- [ ] Content-aware smart cropping with saliency detection
- [ ] Style transfer for artistic effects
- [ ] Enhanced queue management for AI jobs

### 📋 Planned Features

- [ ] Batch AI processing with progress tracking
- [ ] Cost estimation before generation
- [ ] A/B testing for background variants
- [ ] Custom model fine-tuning support
- [ ] Real-time preview generation

## Related Documentation

- [Phase 0: Foundation](./PHASE0_FOUNDATION.md)
- [Phase 1: Core Features](./PHASE1_CORE.md)
- [Phase 2: Presets & Export](./PHASE2_PRESETS.md)
- [API Reference](./API_REFERENCE.md)
- [Architecture Overview](./ARCHITECTURE.md)

## Support

For issues or questions:

1. Check troubleshooting section above
2. Review API provider documentation
3. Check LogoMorph backend logs
4. Verify environment configuration with validation script

---

**Phase 3 Status**: Core AI features implemented ✅
**Next Phase**: Background removal, style transfer, advanced features
