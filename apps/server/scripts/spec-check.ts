import { ErrorCode } from '@dogule/domain';

import { openApiDocument } from '../src/openapi/spec';

const serializeDocument = () => {
  try {
    const serialized = JSON.stringify(openApiDocument, null, 2);
    if (!serialized.includes('"paths"')) {
      throw new Error('OpenAPI document is missing paths definition');
    }

    const parsed = JSON.parse(serialized);
    const pathCount = Object.keys(parsed.paths ?? {}).length;

    if (pathCount === 0) {
      throw new Error('OpenAPI document does not define any paths');
    }

    console.log(`OpenAPI document validated with ${pathCount} paths.`);
  } catch (error) {
    console.error(ErrorCode.ERR_SPEC_CHECK_001, 'Failed to validate OpenAPI document');
    console.error(error);
    process.exit(1);
  }
};

serializeDocument();
