import { ErrorCode } from '@dogule/domain';
import { logError } from '@dogule/utils';

import { seedDatabase } from '../src/infrastructure/database/seed';

seedDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logError(ErrorCode.ERR_SEED_001, error);
    process.exit(1);
  });
