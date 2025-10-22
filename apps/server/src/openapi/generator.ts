import { createSchemaComponents, type OpenApiDocument } from 'zod-to-openapi';
import { z } from 'zod';

import { loginSchema, registerSchema } from '../features/auth/schemas';
import { kundenCreateSchema, kundenUpdateSchema } from '../features/kunden/schemas';
import { hundeCreateSchema, hundeUpdateSchema } from '../features/hunde/schemas';

const authUserSchema = z
  .object({
    id: z.string(),
    email: z.string().email(),
    role: z.string(),
  })
  .strict();

const authResultSchema = z
  .object({
    token: z.string(),
    user: authUserSchema,
  })
  .strict();

const healthSchema = z
  .object({
    ok: z.boolean(),
    ts: z.string().datetime(),
  })
  .strict();

const errorResponseSchema = z
  .object({
    message: z.string(),
  })
  .strict();

const meResponseSchema = z
  .object({
    user: authUserSchema,
  })
  .strict();

const customerResponseSchema = z
  .object({
    id: z.string().uuid(),
    firstName: z.string(),
    lastName: z.string(),
    email: z.string().email(),
    phone: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const dogResponseSchema = z
  .object({
    id: z.string().uuid(),
    kundeId: z.string().uuid(),
    name: z.string(),
    geburtsdatum: z.string().optional(),
    rasse: z.string().optional(),
    notizen: z.string().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
  })
  .strict();

const schemaMap = {
  RegisterRequest: registerSchema,
  LoginRequest: loginSchema,
  AuthResult: authResultSchema,
  MeResponse: meResponseSchema,
  ErrorResponse: errorResponseSchema,
  HealthResponse: healthSchema,
  CustomerCreateRequest: kundenCreateSchema,
  CustomerUpdateRequest: kundenUpdateSchema,
  DogCreateRequest: hundeCreateSchema,
  DogUpdateRequest: hundeUpdateSchema,
  CustomerResponse: customerResponseSchema,
  DogResponse: dogResponseSchema,
} as const;

export const generateOpenApiDocument = (): OpenApiDocument => {
  const { schemas, ref } = createSchemaComponents(schemaMap);

  return {
    openapi: '3.1.0',
    info: {
      title: 'Dogule API',
      version: '0.1.0',
      description: 'API reference for the Dogule platform.',
    },
    tags: [
      { name: 'System', description: 'System readiness and health endpoints.' },
      { name: 'Authentication', description: 'Authentication and user identity flows.' },
      { name: 'Kunden', description: 'Customer management endpoints.' },
      { name: 'Hunde', description: 'Dog management endpoints.' },
    ],
    paths: {
      '/health': {
        get: {
          summary: 'Health check',
          tags: ['System'],
          responses: {
            '200': {
              description: 'Service is healthy.',
              content: {
                'application/json': {
                  schema: ref('HealthResponse'),
                },
              },
            },
          },
        },
      },
      '/api/kunden/{id}': {
        put: {
          summary: 'Update an existing customer',
          tags: ['Kunden'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Customer identifier',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CustomerUpdateRequest'),
              },
            },
          },
          responses: {
            '200': {
              description: 'Customer updated successfully.',
              content: {
                'application/json': {
                  schema: ref('CustomerResponse'),
                },
              },
            },
            '400': {
              description: 'Invalid request payload.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '401': {
              description: 'Unauthorized.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '404': {
              description: 'Customer not found.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete a customer',
          tags: ['Kunden'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Customer identifier',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '204': {
              description: 'Customer deleted successfully.',
            },
            '401': {
              description: 'Unauthorized.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '404': {
              description: 'Customer not found.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/api/hunde/{id}': {
        put: {
          summary: 'Update an existing dog',
          tags: ['Hunde'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Dog identifier',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('DogUpdateRequest'),
              },
            },
          },
          responses: {
            '200': {
              description: 'Dog updated successfully.',
              content: {
                'application/json': {
                  schema: ref('DogResponse'),
                },
              },
            },
            '400': {
              description: 'Invalid request payload.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '401': {
              description: 'Unauthorized.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '404': {
              description: 'Dog not found.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
        delete: {
          summary: 'Delete a dog',
          tags: ['Hunde'],
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              description: 'Dog identifier',
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '204': {
              description: 'Dog deleted successfully.',
            },
            '401': {
              description: 'Unauthorized.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '404': {
              description: 'Dog not found.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/auth/register': {
        post: {
          summary: 'Register a new user',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('RegisterRequest'),
              },
            },
          },
          responses: {
            '201': {
              description: 'User registered successfully.',
              content: {
                'application/json': {
                  schema: ref('AuthResult'),
                },
              },
            },
            '400': {
              description: 'Invalid request payload.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/auth/login': {
        post: {
          summary: 'Authenticate a user',
          tags: ['Authentication'],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('LoginRequest'),
              },
            },
          },
          responses: {
            '200': {
              description: 'Login successful.',
              content: {
                'application/json': {
                  schema: ref('AuthResult'),
                },
              },
            },
            '401': {
              description: 'Invalid credentials.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/auth/me': {
        get: {
          summary: 'Get the currently authenticated user',
          tags: ['Authentication'],
          security: [{ bearerAuth: [] }],
          responses: {
            '200': {
              description: 'Authenticated user profile.',
              content: {
                'application/json': {
                  schema: ref('MeResponse'),
                },
              },
            },
            '401': {
              description: 'Missing or invalid credentials.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/api/kunden': {
        post: {
          summary: 'Create a new customer',
          tags: ['Kunden'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('CustomerCreateRequest'),
              },
            },
          },
          responses: {
            '201': {
              description: 'Customer created successfully.',
              content: {
                'application/json': {
                  schema: ref('CustomerResponse'),
                },
              },
            },
            '400': {
              description: 'Invalid request payload.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
            '401': {
              description: 'Unauthorized.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
      '/api/hunde': {
        post: {
          summary: 'Create a new dog',
          tags: ['Hunde'],
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: ref('DogCreateRequest'),
              },
            },
          },
          responses: {
            '201': {
              description: 'Dog created successfully.',
              content: {
                'application/json': {
                  schema: ref('DogResponse'),
                },
              },
            },
            '400': {
              description: 'Invalid request payload.',
              content: {
                'application/json': {
                  schema: ref('ErrorResponse'),
                },
              },
            },
          },
        },
      },
    },
    components: {
      schemas,
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };
};
