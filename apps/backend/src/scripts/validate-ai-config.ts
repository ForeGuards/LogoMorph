#!/usr/bin/env bun
/*
 * AI Configuration Validation Script
 * Checks if AI services are properly configured
 *
 * Usage: bun run src/scripts/validate-ai-config.ts
 */

import { aiConfig, validateAIConfig, getEnabledFeatures } from '../config/ai';

console.log('🔍 Validating AI Configuration...\n');

// Check configuration validity
const validation = validateAIConfig();

if (validation.valid) {
  console.log('✅ Configuration is valid\n');
} else {
  console.log('❌ Configuration errors:\n');
  validation.errors.forEach((error) => {
    console.log(`   - ${error}`);
  });
  console.log('');
}

// Display enabled features
const features = getEnabledFeatures();
console.log('📋 Enabled Features:');
if (features.length === 0) {
  console.log('   ⚠️  No AI features are enabled');
  console.log('   💡 Set *_ENABLED=true in .env to enable features\n');
} else {
  features.forEach((feature) => {
    console.log(`   ✓ ${feature}`);
  });
  console.log('');
}

// Display provider status
console.log('🔧 Provider Status:');

// OpenAI
if (aiConfig.openai.enabled) {
  console.log(`   ✓ OpenAI: enabled`);
  console.log(`     - Model: ${aiConfig.openai.model}`);
  console.log(`     - Max Tokens: ${aiConfig.openai.maxTokens}`);
} else {
  console.log('   ○ OpenAI: disabled');
}

// Replicate
if (aiConfig.replicate.enabled) {
  console.log(`   ✓ Replicate: enabled`);
  console.log(`     - Model: ${aiConfig.replicate.model}`);
} else {
  console.log('   ○ Replicate: disabled');
}

// Stable Diffusion
if (aiConfig.stableDiffusion.enabled) {
  console.log(`   ✓ Stable Diffusion: enabled`);
  console.log(`     - Base URL: ${aiConfig.stableDiffusion.baseUrl}`);
  console.log(`     - Steps: ${aiConfig.stableDiffusion.steps}`);
} else {
  console.log('   ○ Stable Diffusion: disabled');
}

// Remove.bg
if (aiConfig.removebg.enabled) {
  console.log(`   ✓ Remove.bg: enabled`);
  console.log(`     - Size: ${aiConfig.removebg.size}`);
} else {
  console.log('   ○ Remove.bg: disabled');
}

console.log('');

// Cost controls
console.log('💰 Cost Controls:');
console.log(`   - Max per job: $${aiConfig.maxCostPerJob.toFixed(2)}`);
console.log(`   - Monthly budget: $${aiConfig.monthlyBudget.toFixed(2)}`);
console.log('');

// Caching
console.log('⚡ Performance:');
console.log(`   - Caching: ${aiConfig.enableCaching ? 'enabled' : 'disabled'}`);
if (aiConfig.enableCaching) {
  const hours = Math.floor(aiConfig.cacheExpiry / 3600);
  console.log(`   - Cache expiry: ${hours}h`);
}
console.log('');

// Recommendations
if (!validation.valid || features.length === 0) {
  console.log('💡 Recommendations:');
  console.log('   1. Copy .env.example to .env if not done');
  console.log('   2. Set API keys for desired providers');
  console.log('   3. Enable at least one AI feature');
  console.log('   4. Refer to docs/PHASE3_AI_INTEGRATION.md for setup\n');
}

// Exit with appropriate code
process.exit(validation.valid && features.length > 0 ? 0 : 1);
