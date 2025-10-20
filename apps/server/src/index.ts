import { config as loadEnv } from 'dotenv';
import express from 'express';
import { ApolloServer } from 'apollo-server-express';

loadEnv();

import {
  authMiddleware,
  errorHandler,
  getDatabaseClient,
  loadConfig,
  requestLogger,
} from './infrastructure';
import kundenRouter from './features/kunden/routes';
import hundeRouter from './features/hunde/routes';
import kurseRouter from './features/kurse/routes';
import finanzenRouter from './features/finanzen/routes';
import kalenderRouter from './features/kalender/routes';
import kommunikationRouter from './features/kommunikation/routes';
import { resolvers, typeDefs } from './graphql/schema';

const createServer = async () => {
  const app = express();
  const config = loadConfig();
  const databaseClient = getDatabaseClient();

  app.use(express.json());
  app.use(requestLogger);
  app.use(authMiddleware);

  app.use('/api/kunden', kundenRouter);
  app.use('/api/hunde', hundeRouter);
  app.use('/api/kurse', kurseRouter);
  app.use('/api/finanzen', finanzenRouter);
  app.use('/api/kalender', kalenderRouter);
  app.use('/api/kommunikation', kommunikationRouter);

  app.get('/healthz', (_req, res) => {
    res.json({ status: 'ok' });
  });

  const apollo = new ApolloServer({ typeDefs, resolvers });
  await apollo.start();
  apollo.applyMiddleware({ app, path: '/graphql' });

  app.use(errorHandler);

  await databaseClient.connect();

  app.listen(config.port, () => {
    console.log(`Server is running on port ${config.port}`);
    console.log(`GraphQL endpoint available at /graphql`);
  });
};

export { createServer };

if (process.env.NODE_ENV !== 'test') {
  createServer().catch((error) => {
    console.error('Failed to start server', error);
    process.exit(1);
  });
}
