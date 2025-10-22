import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { ErrorCode } from '@dogule/domain';

import { generateOpenApiDocument } from '../src/openapi/generator';

const SPEC_FILE_PATH = fileURLToPath(new URL('../src/openapi/openapi.json', import.meta.url));

const validateDocument = () => {
  try {
    const generated = generateOpenApiDocument();
    const serialized = JSON.stringify(generated, null, 2);

    if (!generated.paths || Object.keys(generated.paths).length === 0) {
      throw new Error('OpenAPI document does not define any paths');
    }

    const existing = readFileSync(SPEC_FILE_PATH, 'utf-8');
    const normalizedExisting = JSON.stringify(JSON.parse(existing), null, 2);

    if (normalizedExisting !== serialized) {
      throw new Error(
        'Serialized OpenAPI document does not match openapi.json. Run "npm run spec:generate -w apps/server" to update the file.'
      );
    }

    console.log(`OpenAPI document validated with ${Object.keys(generated.paths).length} paths.`);
  } catch (error) {
    console.error(ErrorCode.ERR_SPEC_CHECK_001, 'Failed to validate OpenAPI document');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};

validateDocument();
