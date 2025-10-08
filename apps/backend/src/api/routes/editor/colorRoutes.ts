/**
 * Color Editor API Routes
 */

import { Router, type Response } from 'express';
import { ColorExtractor } from '../../../services/editor/colorExtractor';
import { ColorReplacer, type ColorReplacement } from '../../../services/editor/colorReplacer';

const router = Router();
const colorExtractor = new ColorExtractor();
const colorReplacer = new ColorReplacer();

const handleError = (res: Response, label: string, error: unknown, fallback: string) => {
  console.error(label, error);
  const message = error instanceof Error ? error.message : fallback;
  return res.status(500).json({
    success: false,
    error: message,
  });
};

interface ColorReplacementRequest {
  from: string;
  to: string;
  tolerance?: number;
}

/**
 * @swagger
 * /api/editor/colors/extract/svg:
 *   post:
 *     summary: Extract colors from SVG content
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *             properties:
 *               svgContent:
 *                 type: string
 *     responses:
 *       200:
 *         description: Extracted colors
 */
router.post('/extract/svg', async (req, res) => {
  try {
    const { svgContent } = req.body;

    if (!svgContent || typeof svgContent !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'svgContent is required and must be a string',
      });
    }

    const colors = await colorExtractor.extractFromSVG(svgContent);

    return res.json({
      success: true,
      data: { colors },
    });
  } catch (error) {
    return handleError(res, '[ColorRoutes] Extract SVG error:', error, 'Failed to extract colors');
  }
});

/**
 * @swagger
 * /api/editor/colors/extract/image:
 *   post:
 *     summary: Extract colors from raster image
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - imagePath
 *             properties:
 *               imagePath:
 *                 type: string
 *               maxColors:
 *                 type: number
 *     responses:
 *       200:
 *         description: Extracted colors
 */
router.post('/extract/image', async (req, res) => {
  try {
    const { imagePath, maxColors } = req.body;

    if (!imagePath || typeof imagePath !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'imagePath is required',
      });
    }

    const colors = await colorExtractor.extractFromImage(imagePath, maxColors);

    return res.json({
      success: true,
      data: { colors },
    });
  } catch (error) {
    return handleError(
      res,
      '[ColorRoutes] Extract image error:',
      error,
      'Failed to extract colors',
    );
  }
});

/**
 * @swagger
 * /api/editor/colors/replace/svg:
 *   post:
 *     summary: Replace colors in SVG
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - svgContent
 *               - replacements
 *             properties:
 *               svgContent:
 *                 type: string
 *               replacements:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     from:
 *                       type: string
 *                     to:
 *                       type: string
 *                     tolerance:
 *                       type: number
 *     responses:
 *       200:
 *         description: Modified SVG content
 */
router.post('/replace/svg', async (req, res) => {
  try {
    const { svgContent, replacements } = req.body;

    if (!svgContent || !replacements || !Array.isArray(replacements)) {
      return res.status(400).json({
        success: false,
        error: 'svgContent and replacements array are required',
      });
    }

    // Validate replacements
    for (const replacement of replacements) {
      if (!replacement.from || !replacement.to) {
        return res.status(400).json({
          success: false,
          error: 'Each replacement must have "from" and "to" colors',
        });
      }
    }

    const replacementInstructions: ColorReplacement[] = replacements.map(
      (replacement: ColorReplacementRequest) => ({
        from: replacement.from,
        to: replacement.to,
        tolerance: replacement.tolerance,
      }),
    );

    const modifiedSvg = await colorReplacer.replaceInSVG(svgContent, replacementInstructions);

    return res.json({
      success: true,
      data: {
        modifiedSvg,
        replacementsApplied: replacements.length,
      },
    });
  } catch (error) {
    return handleError(res, '[ColorRoutes] Replace SVG error:', error, 'Failed to replace colors');
  }
});

/**
 * @swagger
 * /api/editor/colors/palette:
 *   post:
 *     summary: Generate color palette from base color
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - baseColor
 *               - type
 *             properties:
 *               baseColor:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [complementary, analogous, triadic]
 *     responses:
 *       200:
 *         description: Generated color palette
 */
router.post('/palette', async (req, res) => {
  try {
    const { baseColor, type } = req.body;

    if (!baseColor || !type) {
      return res.status(400).json({
        success: false,
        error: 'baseColor and type are required',
      });
    }

    if (!['complementary', 'analogous', 'triadic'].includes(type)) {
      return res.status(400).json({
        success: false,
        error: 'type must be one of: complementary, analogous, triadic',
      });
    }

    const palette = colorExtractor.generatePalette(baseColor, type);

    return res.json({
      success: true,
      data: {
        palette,
        type,
        baseColor,
      },
    });
  } catch (error) {
    return handleError(
      res,
      '[ColorRoutes] Generate palette error:',
      error,
      'Failed to generate palette',
    );
  }
});

export default router;
