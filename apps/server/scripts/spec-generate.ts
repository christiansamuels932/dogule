import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { generateOpenApiDocument } from '../src/openapi/generator';

const SPEC_FILE_PATH = fileURLToPath(new URL('../src/openapi/openapi.json', import.meta.url));

const document = generateOpenApiDocument();

writeFileSync(SPEC_FILE_PATH, `${JSON.stringify(document, null, 2)}\n`);

console.log(`OpenAPI specification written to ${SPEC_FILE_PATH}`);
