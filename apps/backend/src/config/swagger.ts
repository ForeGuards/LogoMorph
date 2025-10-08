/**
 * OpenAPI/Swagger Configuration
 *
 * Defines the API documentation structure for LogoMorph API
 * Following RESTful best practices and OpenAPI 3.0 specification
 */

import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'LogoMorph API',
      version: '1.0.0',
      description: 'AI-powered logo variant generation platform API',
      contact: {
        name: 'LogoMorph Support',
        email: 'support@logomorph.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:4000',
        description: 'Development server',
      },
      {
        url: 'https://api.logomorph.com',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        clerkAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Clerk JWT token from authentication',
        },
        apiKey: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for programmatic access',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code',
            },
            details: {
              type: 'object',
              description: 'Additional error details',
            },
          },
        },
        Logo: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Logo ID',
            },
            clerkUserId: {
              type: 'string',
              description: 'User ID from Clerk',
            },
            filename: {
              type: 'string',
              description: 'Original filename',
            },
            storagePath: {
              type: 'string',
              description: 'S3 storage path',
            },
            format: {
              type: 'string',
              enum: ['svg', 'png', 'jpg'],
              description: 'File format',
            },
            metadata: {
              type: 'object',
              properties: {
                width: { type: 'number' },
                height: { type: 'number' },
                boundingBox: {
                  type: 'object',
                  properties: {
                    x: { type: 'number' },
                    y: { type: 'number' },
                    width: { type: 'number' },
                    height: { type: 'number' },
                  },
                },
                colorPalette: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Job: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Job ID',
            },
            clerkUserId: {
              type: 'string',
              description: 'User ID from Clerk',
            },
            logoId: {
              type: 'string',
              description: 'Associated logo ID',
            },
            type: {
              type: 'string',
              enum: ['generate', 'export'],
              description: 'Job type',
            },
            status: {
              type: 'string',
              enum: ['pending', 'processing', 'completed', 'failed'],
              description: 'Job status',
            },
            progress: {
              type: 'number',
              minimum: 0,
              maximum: 100,
              description: 'Job progress percentage',
            },
            result: {
              type: 'object',
              description: 'Job result data',
            },
            error: {
              type: 'string',
              description: 'Error message if failed',
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Preset: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'Preset ID',
            },
            name: {
              type: 'string',
              description: 'Preset name',
            },
            width: {
              type: 'number',
              description: 'Output width in pixels',
            },
            height: {
              type: 'number',
              description: 'Output height in pixels',
            },
            settings: {
              type: 'object',
              description: 'Preset configuration',
            },
            isSystem: {
              type: 'boolean',
              description: 'Is system preset',
            },
          },
        },
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication failed or missing',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ForbiddenError: {
          description: 'Insufficient permissions',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        ValidationError: {
          description: 'Validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
        RateLimitError: {
          description: 'Rate limit exceeded',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/Error',
              },
            },
          },
        },
      },
    },
    security: [
      {
        clerkAuth: [],
      },
      {
        apiKey: [],
      },
    ],
  },
  apis: ['./src/api/routes/*.ts', './src/api/controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
