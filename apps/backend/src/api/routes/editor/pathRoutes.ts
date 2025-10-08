/**
 * Path Editor API Routes
 */

import { Router, type Response } from 'express';
import { PathEditor } from '../../../services/editor/pathEditor';
import { PathValidator } from '../../../services/editor/pathValidator';

const router = Router();
const pathEditor = new PathEditor();
const pathValidator = new PathValidator();

const handleError = (
  res: Response,
  label: string,
  error: unknown,
  status: number,
  fallback: string,
) => {
  console.error(label, error);
  const message = error instanceof Error ? error.message : fallback;
  return res.status(status).json({
    success: false,
    error: message,
  });
};

/**
 * @swagger
 * /api/editor/paths/parse:
 *   post:
 *     summary: Parse SVG path string into structured data
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathString
 *             properties:
 *               pathString:
 *                 type: string
 *                 description: SVG path d attribute value
 *               pathId:
 *                 type: string
 *                 description: Optional ID for the path
 *     responses:
 *       200:
 *         description: Parsed path data
 *       400:
 *         description: Invalid path string
 */
router.post('/parse', async (req, res) => {
  try {
    const { pathString, pathId } = req.body;

    if (!pathString || typeof pathString !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'pathString is required and must be a string',
      });
    }

    const parsed = pathEditor.parsePath(pathString, pathId);
    const validation = pathValidator.validate(parsed);

    return res.json({
      success: true,
      data: {
        path: parsed,
        validation,
      },
    });
  } catch (error) {
    return handleError(res, '[PathRoutes] Parse error:', error, 400, 'Failed to parse path');
  }
});

/**
 * @swagger
 * /api/editor/paths/update-point:
 *   patch:
 *     summary: Update a specific point in a path
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathString
 *               - pointIndex
 *               - x
 *               - y
 *             properties:
 *               pathString:
 *                 type: string
 *               pointIndex:
 *                 type: number
 *               x:
 *                 type: number
 *               y:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated path
 *       400:
 *         description: Invalid request
 */
router.patch('/update-point', async (req, res) => {
  try {
    const { pathString, pointIndex, x, y } = req.body;

    if (!pathString || typeof pathString !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'pathString is required',
      });
    }

    if (typeof pointIndex !== 'number' || typeof x !== 'number' || typeof y !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'pointIndex, x, and y must be numbers',
      });
    }

    // Parse the path
    const parsed = pathEditor.parsePath(pathString);

    // Update the point
    const updated = pathEditor.updatePoint(parsed, pointIndex, x, y);

    // Validate the result
    const validation = pathValidator.validate(updated);

    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'Updated path is invalid',
        validation,
      });
    }

    return res.json({
      success: true,
      data: {
        path: updated,
        validation,
      },
    });
  } catch (error) {
    return handleError(
      res,
      '[PathRoutes] Update point error:',
      error,
      400,
      'Failed to update point',
    );
  }
});

/**
 * @swagger
 * /api/editor/paths/add-point:
 *   post:
 *     summary: Add a new point to a path
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathString
 *               - afterIndex
 *               - x
 *               - y
 *             properties:
 *               pathString:
 *                 type: string
 *               afterIndex:
 *                 type: number
 *               x:
 *                 type: number
 *               y:
 *                 type: number
 *               type:
 *                 type: string
 *                 enum: [M, L, C, Q, Z]
 *     responses:
 *       200:
 *         description: Updated path with new point
 */
router.post('/add-point', async (req, res) => {
  try {
    const { pathString, afterIndex, x, y, type } = req.body;

    if (
      !pathString ||
      typeof afterIndex !== 'number' ||
      typeof x !== 'number' ||
      typeof y !== 'number'
    ) {
      return res.status(400).json({
        success: false,
        error: 'pathString, afterIndex, x, and y are required',
      });
    }

    const parsed = pathEditor.parsePath(pathString);
    const updated = pathEditor.addPoint(parsed, afterIndex, x, y, type);
    const validation = pathValidator.validate(updated);

    return res.json({
      success: true,
      data: {
        path: updated,
        validation,
      },
    });
  } catch (error) {
    return handleError(res, '[PathRoutes] Add point error:', error, 400, 'Failed to add point');
  }
});

/**
 * @swagger
 * /api/editor/paths/remove-point:
 *   delete:
 *     summary: Remove a point from a path
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathString
 *               - pointIndex
 *             properties:
 *               pathString:
 *                 type: string
 *               pointIndex:
 *                 type: number
 *     responses:
 *       200:
 *         description: Updated path without the removed point
 */
router.delete('/remove-point', async (req, res) => {
  try {
    const { pathString, pointIndex } = req.body;

    if (!pathString || typeof pointIndex !== 'number') {
      return res.status(400).json({
        success: false,
        error: 'pathString and pointIndex are required',
      });
    }

    const parsed = pathEditor.parsePath(pathString);
    const updated = pathEditor.removePoint(parsed, pointIndex);
    const validation = pathValidator.validate(updated);

    return res.json({
      success: true,
      data: {
        path: updated,
        validation,
      },
    });
  } catch (error) {
    return handleError(
      res,
      '[PathRoutes] Remove point error:',
      error,
      400,
      'Failed to remove point',
    );
  }
});

/**
 * @swagger
 * /api/editor/paths/validate:
 *   post:
 *     summary: Validate a path
 *     tags: [Editor]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - pathString
 *             properties:
 *               pathString:
 *                 type: string
 *     responses:
 *       200:
 *         description: Validation result
 */
router.post('/validate', async (req, res) => {
  try {
    const { pathString } = req.body;

    if (!pathString || typeof pathString !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'pathString is required',
      });
    }

    const parsed = pathEditor.parsePath(pathString);
    const validation = pathValidator.validate(parsed);
    const hasSelfIntersection = pathValidator.checkSelfIntersection(parsed);

    return res.json({
      success: true,
      data: {
        validation,
        hasSelfIntersection,
      },
    });
  } catch (error) {
    return handleError(res, '[PathRoutes] Validate error:', error, 400, 'Failed to validate path');
  }
});

export default router;
