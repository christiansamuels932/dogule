import type { ZodTypeAny } from 'zod';

export interface SchemaObject {
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

export interface ReferenceObject {
  $ref: string;
}

export interface SchemaComponents {
  schemas: Record<string, SchemaObject>;
  ref: (name: string) => ReferenceObject;
}

export interface OpenApiDocument {
  openapi: string;
  info: {
    title: string;
    version: string;
    description?: string;
  };
  tags?: Array<{ name: string; description?: string }>;
  paths: Record<string, unknown>;
  components: {
    schemas: Record<string, SchemaObject>;
    securitySchemes?: Record<string, unknown>;
  };
}

export declare const convertZodToOpenApi: (schema: ZodTypeAny) => SchemaObject;
export declare const createSchemaComponents: (schemaMap: Record<string, ZodTypeAny>) => SchemaComponents;
export declare const createOpenApiDocument: <T extends { components?: { schemas?: Record<string, SchemaObject> } }>(
  document: T,
  schemaMap: Record<string, ZodTypeAny>
) => T & { components: { schemas: Record<string, SchemaObject> } } & { ref: (name: string) => ReferenceObject };
export declare const createSchemaRef: (name: string) => ReferenceObject;

const _default: {
  convertZodToOpenApi: typeof convertZodToOpenApi;
  createSchemaComponents: typeof createSchemaComponents;
  createOpenApiDocument: typeof createOpenApiDocument;
  createSchemaRef: typeof createSchemaRef;
};

export default _default;
