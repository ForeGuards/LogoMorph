/**
 * Effects Library API Routes
 * Phase 6.1: Advanced Editing Features
 */

import { Router, type Response } from 'express';
import { requireAuth } from '@clerk/express';
import { EffectsLibrary } from '../../../services/editor/effectsLibrary';

const router = Router();
const effectsLibrary = new EffectsLibrary();

const handleError = (res: Response, label: string, error: unknown, fallback: string) => {
  console.error(label, error);
  const message = error instanceof Error ? error.message : fallback;
  return res.status(500).json({
    success: false,
    error: message,
  });
};

/**
 * @swagger
 * /api/editor/effects/presets:
 *   get:
 *     summary: Get all available effect presets
 *     tags: [Editor - Effects]
 *     security:
 *       - ClerkAuth: []
 *     responses:
 *       200:
 *         description: List of effect presets
 */
router.get('/presets', requireAuth(), (req, res) => {
  try {
    const presets = effectsLibrary.getPresets();

    return res.json({
      success: true,
      data: {
        presets: Object.keys(presets).map((name) => ({
          name,
          effects: presets[name],
        })),
      },
    });
  } catch (error) {
    return handleError(res, '[EffectsRoutes] Get presets error:', error, 'Failed to get presets');
  }
});

/**
 * @swagger
 * /api/editor/effects/apply:
 *   post:
 *     summary: Apply effects to SVG content
 *     tags: [Editor - Effects]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *               - effects
 *             properties:
 *               svgContent:
 *                 type: string
 *               effects:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Modified SVG with effects applied
 */
router.post('/apply', requireAuth(), async (req, res) => {
  try {
    const { svgContent, effects } = req.body;

    if (!svgContent || typeof svgContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'svgContent is required and must be a string',
      });
    }

    if (!effects || !Array.isArray(effects)) {
      return res.status(400).json({
        success: false,
        error: 'effects must be an array',
      });
    }

    const modified = effectsLibrary.applyEffects(svgContent, effects);

    return res.json({
      success: true,
      data: {
        modifiedSvg: modified,
        effectsApplied: effects.length,
      },
    });
  } catch (error) {
    return handleError(
      res,
      '[EffectsRoutes] Apply effects error:',
      error,
      'Failed to apply effects',
    );
  }
});

/**
 * @swagger
 * /api/editor/effects/apply-preset:
 *   post:
 *     summary: Apply a preset effect to SVG content
 *     tags: [Editor - Effects]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *               - presetName
 *             properties:
 *               svgContent:
 *                 type: string
 *               presetName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Modified SVG with preset applied
 */
router.post('/apply-preset', requireAuth(), async (req, res) => {
  try {
    const { svgContent, presetName } = req.body;

    if (!svgContent || !presetName) {
      return res.status(400).json({
        success: false,
        error: 'svgContent and presetName are required',
      });
    }

    const presets = effectsLibrary.getPresets();
    const effects = presets[presetName];

    if (!effects) {
      return res.status(404).json({
        success: false,
        error: `Preset not found: ${presetName}`,
      });
    }

    const modified = effectsLibrary.applyEffects(svgContent, effects);

    return res.json({
      success: true,
      data: {
        modifiedSvg: modified,
        presetName,
        effectsApplied: effects.length,
      },
    });
  } catch (error) {
    return handleError(res, '[EffectsRoutes] Apply preset error:', error, 'Failed to apply preset');
  }
});

/**
 * @swagger
 * /api/editor/effects/shadow:
 *   post:
 *     summary: Apply shadow effect to SVG
 *     tags: [Editor - Effects]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *               - offsetX
 *               - offsetY
 *               - blur
 *               - color
 *               - opacity
 *             properties:
 *               svgContent:
 *                 type: string
 *               offsetX:
 *                 type: number
 *               offsetY:
 *                 type: number
 *               blur:
 *                 type: number
 *               color:
 *                 type: string
 *               opacity:
 *                 type: number
 *     responses:
 *       200:
 *         description: SVG with shadow effect
 */
router.post('/shadow', requireAuth(), async (req, res) => {
  try {
    const { svgContent, offsetX, offsetY, blur, color, opacity } = req.body;

    if (!svgContent) {
      return res.status(400).json({
        success: false,
        error: 'svgContent is required',
      });
    }

    const effect = {
      type: 'shadow' as const,
      offsetX: offsetX || 2,
      offsetY: offsetY || 2,
      blur: blur || 4,
      color: color || '#000000',
      opacity: opacity || 0.3,
    };

    const modified = effectsLibrary.applyShadow(svgContent, effect);

    return res.json({
      success: true,
      data: {
        modifiedSvg: modified,
        effect,
      },
    });
  } catch (error) {
    return handleError(res, '[EffectsRoutes] Apply shadow error:', error, 'Failed to apply shadow');
  }
});

/**
 * @swagger
 * /api/editor/effects/glow:
 *   post:
 *     summary: Apply glow effect to SVG
 *     tags: [Editor - Effects]
 *     security:
 *       - ClerkAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *               - blur
 *               - color
 *               - intensity
 *             properties:
 *               svgContent:
 *                 type: string
 *               blur:
 *                 type: number
 *               color:
 *                 type: string
 *               intensity:
 *                 type: number
 *     responses:
 *       200:
 *         description: SVG with glow effect
 */
router.post('/glow', requireAuth(), async (req, res) => {
  try {
    const { svgContent, blur, color, intensity } = req.body;

    if (!svgContent) {
      return res.status(400).json({
        success: false,
        error: 'svgContent is required',
      });
    }

    const effect = {
      type: 'glow' as const,
      blur: blur || 10,
      color: color || '#00ffff',
      intensity: intensity || 2,
    };

    const modified = effectsLibrary.applyGlow(svgContent, effect);

    return res.json({
      success: true,
      data: {
        modifiedSvg: modified,
        effect,
      },
    });
  } catch (error) {
    return handleError(res, '[EffectsRoutes] Apply glow error:', error, 'Failed to apply glow');
  }
});

export default router;
