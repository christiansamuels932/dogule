import {
  ZodBoolean,
  ZodEffects,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodTypeAny,
  ZodUnion,
  z,
} from 'zod';

import { loginSchema, registerSchema } from '../features/auth/schemas';
import { kundenCreateSchema, kundenUpdateSchema } from '../features/kunden/schemas';
import { hundeCreateSchema, hundeUpdateSchema } from '../features/hunde/schemas';

interface SchemaObject {
  type?: string;
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  properties?: Record<string, SchemaObject>;
  required?: string[];
  additionalProperties?: boolean;
  nullable?: boolean;
  oneOf?: SchemaObject[];
  items?: SchemaObject;
  enum?: string[];
  description?: string;
}

interface ReferenceObject {
  $ref: string;
}

interface MediaTypeObject {
  schema: SchemaObject | ReferenceObject;
}

interface ResponseObject {
  description: string;
  content?: Record<string, MediaTypeObject>;
}

interface RequestBodyObject {
  required?: boolean;
  content: Record<string, MediaTypeObject>;
}

interface ParameterObject {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description?: string;
  schema: SchemaObject;
}

interface OperationObject {
  summary: string;
  tags?: string[];
  requestBody?: RequestBodyObject;
  responses: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
  parameters?: ParameterObject[];
}

interface PathItemObject {
  get?: OperationObject;
  post?: OperationObject;
  put?: OperationObject;
  delete?: OperationObject;
}

interface SecuritySchemeObject {
  type: 'http';
  scheme: 'bearer';
  bearerFormat?: string;
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, PathItemObject>;
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, SecuritySchemeObject>;
  };
}

type ConvertedSchema = {
  schema: SchemaObject;
  optional: boolean;
};

const convertString = (schema: ZodString): SchemaObject => {
  const result: SchemaObject = { type: 'string' };

  for (const check of schema._def.checks) {
    switch (check.kind) {
      case 'email': {
        result.format = 'email';
        break;
      }
      case 'uuid': {
        result.format = 'uuid';
        break;
      }
      case 'datetime': {
        result.format = 'date-time';
        if (check.precision !== undefined) {
          result.description = `Date-time with precision ${check.precision}`;
        }
        break;
      }
      case 'date': {
        result.format = 'date';
        break;
      }
      case 'min': {
        if (typeof check.value === 'number') {
          result.minLength = Math.max(result.minLength ?? 0, check.value);
        }
        break;
      }
      case 'max': {
        if (typeof check.value === 'number') {
          result.maxLength = Math.min(result.maxLength ?? Infinity, check.value);
        }
        break;
      }
      case 'regex': {
        result.pattern = check.regex.source;
        break;
      }
      default:
        break;
    }
  }

  if (result.maxLength === Infinity) {
    delete result.maxLength;
  }

  return result;
};

const isNullSchema = (schema: SchemaObject) => schema.type === 'null';

const convertSchema = (schema: ZodTypeAny): ConvertedSchema => {
  if (schema instanceof ZodOptional) {
    const inner = convertSchema(schema._def.innerType);
    return { schema: inner.schema, optional: true };
  }

  if (schema instanceof ZodNullable) {
    const inner = convertSchema(schema._def.innerType);
    inner.schema.nullable = true;
    return inner;
  }

  if (schema instanceof ZodEffects) {
    return convertSchema(schema._def.schema);
  }

  if (schema instanceof ZodUnion) {
    const unionOptions = schema._def.options as ZodTypeAny[];
    const convertedOptions = unionOptions.map((candidate) => convertSchema(candidate));
    const nonNullOptions = convertedOptions.filter((candidate) => !isNullSchema(candidate.schema));
    const hasNull = nonNullOptions.length !== convertedOptions.length;

    if (nonNullOptions.length === 1) {
      const base = { ...nonNullOptions[0].schema };
      if (hasNull) {
        base.nullable = true;
      }
      return { schema: base, optional: convertedOptions.some((candidate) => candidate.optional) };
    }

    const unionSchema: SchemaObject = {
      oneOf: nonNullOptions.map((candidate) => candidate.schema),
    };

    if (hasNull) {
      unionSchema.nullable = true;
    }

    return { schema: unionSchema, optional: convertedOptions.some((candidate) => candidate.optional) };
  }

  if (schema instanceof ZodObject) {
    const shape = schema._def.shape() as Record<string, ZodTypeAny>;
    const properties: Record<string, SchemaObject> = {};
    const required: string[] = [];

    for (const key of Object.keys(shape)) {
      const converted = convertSchema(shape[key]);
      properties[key] = converted.schema;
      if (!converted.optional) {
        required.push(key);
      }
    }

    const objectSchema: SchemaObject = {
      type: 'object',
      properties,
    };

    if (schema._def.unknownKeys === 'strict') {
      objectSchema.additionalProperties = false;
    } else if (schema._def.unknownKeys === 'passthrough') {
      objectSchema.additionalProperties = true;
    }

    if (required.length > 0) {
      objectSchema.required = required;
    }

    return { schema: objectSchema, optional: false };
  }

  if (schema instanceof ZodString) {
    return { schema: convertString(schema), optional: false };
  }

  if (schema instanceof ZodNumber) {
    return { schema: { type: 'number' }, optional: false };
  }

  if (schema instanceof ZodBoolean) {
    return { schema: { type: 'boolean' }, optional: false };
  }

  if (schema instanceof ZodNull) {
    return { schema: { type: 'null' }, optional: false };
  }

  throw new Error(`Unsupported Zod schema: ${schema.constructor.name}`);
};

const ref = (name: string): ReferenceObject => ({
  $ref: `#/components/schemas/${name}`,
});

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

const schemas: Record<string, SchemaObject> = {
  RegisterRequest: convertSchema(registerSchema).schema,
  LoginRequest: convertSchema(loginSchema).schema,
  AuthResult: convertSchema(authResultSchema).schema,
  MeResponse: convertSchema(meResponseSchema).schema,
  ErrorResponse: convertSchema(errorResponseSchema).schema,
  HealthResponse: convertSchema(healthSchema).schema,
  CustomerCreateRequest: convertSchema(kundenCreateSchema).schema,
  CustomerUpdateRequest: convertSchema(kundenUpdateSchema).schema,
  DogCreateRequest: convertSchema(hundeCreateSchema).schema,
  DogUpdateRequest: convertSchema(hundeUpdateSchema).schema,
  CustomerResponse: convertSchema(customerResponseSchema).schema,
  DogResponse: convertSchema(dogResponseSchema).schema,
};

export const openApiDocument: OpenApiDocument = {
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
    '/ready': {
      get: {
        summary: 'Readiness check',
        tags: ['System'],
        responses: {
          '200': {
            description: 'Service is ready to accept traffic.',
            content: {
              'application/json': {
                schema: ref('HealthResponse'),
              },
            },
          },
          '503': {
            description: 'Database connectivity issue.',
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
            description: 'Registration successful.',
            content: {
              'application/json': {
                schema: ref('AuthResult'),
              },
            },
          },
          '409': {
            description: 'Email already in use.',
            content: {
              'application/json': {
                schema: ref('ErrorResponse'),
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

export default openApiDocument;
