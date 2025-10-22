import {
  ZodBoolean,
  ZodEffects,
  ZodNull,
  ZodNullable,
  ZodNumber,
  ZodObject,
  ZodOptional,
  ZodString,
  ZodUnion,
} from 'zod';

const convertString = (schema) => {
  const result = { type: 'string' };

  for (const check of schema._def.checks) {
    switch (check.kind) {
      case 'email':
        result.format = 'email';
        break;
      case 'uuid':
        result.format = 'uuid';
        break;
      case 'datetime':
        result.format = 'date-time';
        if (check.precision !== undefined) {
          result.description = `Date-time with precision ${check.precision}`;
        }
        break;
      case 'date':
        result.format = 'date';
        break;
      case 'min':
        if (typeof check.value === 'number') {
          result.minLength = Math.max(result.minLength ?? 0, check.value);
        }
        break;
      case 'max':
        if (typeof check.value === 'number') {
          result.maxLength = Math.min(result.maxLength ?? Infinity, check.value);
        }
        break;
      case 'regex':
        result.pattern = check.regex.source;
        break;
      default:
        break;
    }
  }

  if (result.maxLength === Infinity) {
    delete result.maxLength;
  }

  return result;
};

const isNullSchema = (schema) => schema.type === 'null';

const convertSchema = (schema) => {
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
    const unionOptions = schema._def.options;
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

    const unionSchema = {
      oneOf: nonNullOptions.map((candidate) => candidate.schema),
    };

    if (hasNull) {
      unionSchema.nullable = true;
    }

    return { schema: unionSchema, optional: convertedOptions.some((candidate) => candidate.optional) };
  }

  if (schema instanceof ZodObject) {
    const shape = schema._def.shape();
    const properties = {};
    const required = [];

    for (const key of Object.keys(shape)) {
      const converted = convertSchema(shape[key]);
      properties[key] = converted.schema;
      if (!converted.optional) {
        required.push(key);
      }
    }

    const objectSchema = {
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

export const convertZodToOpenApi = (schema) => convertSchema(schema).schema;

export const createSchemaComponents = (schemaMap) => {
  const schemas = {};

  for (const [name, schema] of Object.entries(schemaMap)) {
    schemas[name] = convertZodToOpenApi(schema);
  }

  const ref = (name) => {
    if (!schemas[name]) {
      throw new Error(`Schema ${name} has not been registered`);
    }
    return { $ref: `#/components/schemas/${name}` };
  };

  return { schemas, ref };
};

export const createOpenApiDocument = (document, schemaMap) => {
  const { schemas, ref } = createSchemaComponents(schemaMap);
  return {
    ...document,
    components: {
      ...(document.components ?? {}),
      schemas,
    },
    ref,
  };
};

export const createSchemaRef = (name) => ({ $ref: `#/components/schemas/${name}` });

export default {
  convertZodToOpenApi,
  createSchemaComponents,
  createOpenApiDocument,
  createSchemaRef,
};
