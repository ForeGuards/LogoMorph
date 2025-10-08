/**
 * Validation Middleware
 *
 * Provides request validation using Zod schemas
 * Validates body, query, and params separately
 */

import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';

/**
 * Validation middleware factory
 *
 * Option 1: Manual validation (pros: explicit control; cons: verbose)
 * Option 2: Middleware factory (pros: reusable, clean; cons: slight complexity)
 * Chosen: Middleware factory for reusability and clean route definitions
 */
export const validate = (schema: {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }

      // Validate query parameters
      if (schema.query) {
        req.query = await schema.query.parseAsync(req.query);
      }

      // Validate URL parameters
      if (schema.params) {
        req.params = await schema.params.parseAsync(req.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
          })),
        });
      }

      // Unexpected error
      console.error('Validation middleware error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      });
    }
  };
};

/**
 * File upload validation middleware
 * Validates uploaded files separately from body
 */
export const validateFile = (options: {
  required?: boolean;
  maxSize?: number;
  allowedTypes?: string[];
}) => {
  const {
    required = true,
    maxSize = 10 * 1024 * 1024, // 10MB default
    allowedTypes = ['image/svg+xml', 'image/png', 'image/jpeg'],
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if file exists
    if (!req.files || Object.keys(req.files).length === 0) {
      if (required) {
        return res.status(400).json({
          error: 'No file uploaded',
          code: 'FILE_REQUIRED',
        });
      }
      return next();
    }

    // Get the file (assuming single file upload with key 'file')
    const file = Array.isArray(req.files.file) ? req.files.file[0] : req.files.file;

    if (!file) {
      return res.status(400).json({
        error: 'Invalid file upload',
        code: 'INVALID_FILE',
      });
    }

    // Validate file size
    if (file.size > maxSize) {
      return res.status(400).json({
        error: `File size exceeds ${maxSize / 1024 / 1024}MB limit`,
        code: 'FILE_TOO_LARGE',
        details: {
          maxSize,
          actualSize: file.size,
        },
      });
    }

    // Validate file type
    if (!allowedTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: 'Invalid file type',
        code: 'INVALID_FILE_TYPE',
        details: {
          allowedTypes,
          actualType: file.mimetype,
        },
      });
    }

    next();
  };
};

/**
 * Sanitize output to prevent sensitive data leakage
 */
type Sanitizable =
  | Record<string, unknown>
  | unknown[]
  | string
  | number
  | boolean
  | null
  | undefined;

export const sanitizeOutput = <T extends Sanitizable>(data: T): T => {
  if (data === null || data === undefined) {
    return data;
  }

  const sensitiveFields = ['keyHash', 'secret', 'password', 'token'];

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeOutput(item)) as T;
  }

  if (typeof data === 'object') {
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (!sensitiveFields.includes(key)) {
        sanitized[key] = sanitizeOutput(value);
      }
    }
    return sanitized as T;
  }

  return data;
};
