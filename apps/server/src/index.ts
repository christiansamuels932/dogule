import express from 'express';
import { ApolloServer } from 'apollo-server-express';

import { ErrorCode, LogCode } from '@dogule/domain';
import { bootstrapEnv, logError, logInfo } from '@dogule/utils';

bootstrapEnv();

import {
  authMiddleware,
  errorHandler,
  getDatabaseClient,
  loadConfig,
  createRateLimiter,
  requestLogger,
} from './infrastructure';
import authRouter from './features/auth/routes';
import kundenRouter from './features/kunden/routes';
import hundeRouter from './features/hunde/routes';
import kurseRouter from './features/kurse/routes';
import finanzenRouter from './features/finanzen/routes';
import kalenderRouter from './features/kalender/routes';
import kommunikationRouter from './features/kommunikation/routes';
import dashboardRouter from './features/dashboard/routes';
import { resolvers, typeDefs } from './graphql/schema';
import { openApiDocument } from './openapi/spec';

const createApp = async () => {
  const app = express();
  const config = loadConfig();
  const databaseClient = getDatabaseClient();
  await databaseClient.connect();

  app.use(express.json());
  app.use(requestLogger);

  app.get('/health', (_req, res) => {
    const ts = new Date().toISOString();
    logInfo(LogCode.LOG_HEALTH_OK_001);
    res.json({ ok: true, ts });
  });

  app.get('/ready', async (_req, res) => {
    try {
      await databaseClient.query({ text: 'SELECT 1' });
      const ts = new Date().toISOString();
      logInfo(LogCode.LOG_HEALTH_OK_001);
      res.json({ ok: true, ts });
    } catch (error) {
      logError(ErrorCode.ERR_HEALTH_DB_001, error);
      res.status(503).json({ message: ErrorCode.ERR_HEALTH_DB_001 });
    }
  });

  app.get('/docs.json', (_req, res) => {
    res.json(openApiDocument);
  });

  const rateLimitConfig = config.rateLimit;
  const authRateLimiter = createRateLimiter(rateLimitConfig);
  const graphqlRateLimiter = createRateLimiter(rateLimitConfig);

  app.use('/auth', authRateLimiter, authRouter);
  app.use('/graphql', graphqlRateLimiter);
  app.use(authMiddleware);

  app.use('/api/kunden', kundenRouter);
  app.use('/api/hunde', hundeRouter);
  app.use('/api/kurse', kurseRouter);
  app.use('/api/finanzen', finanzenRouter);
  app.use('/api/kalender', kalenderRouter);
  app.use('/api/kommunikation', kommunikationRouter);
  app.use('/dashboard', dashboardRouter);

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  apollo.applyMiddleware({ app, path: '/graphql' });

  app.use(errorHandler);

  return { app, config };
};

const createServer = async () => {
  const { app, config } = await createApp();

  app.listen(config.port, () => {
    logInfo(`Server is running on port ${config.port}`);
    logInfo(`GraphQL endpoint available at /graphql`);
  });
};

export { createServer, createApp };

if (process.env.NODE_ENV !== 'test') {
  createServer().catch((error) => {
    logError('Failed to start server', error);
    process.exit(1);
  });
}
