import { config as loadEnv } from 'dotenv';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';

import { logError, logInfo } from '@dogule/utils';

loadEnv();

import {
  authMiddleware,
  errorHandler,
  getDatabaseClient,
  loadConfig,
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

const createApp = async () => {
  const app = express();
  const config = loadConfig();
  const databaseClient = getDatabaseClient();
  await databaseClient.connect();

  app.use(express.json());
  app.use(requestLogger);

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/auth', authRouter);
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
