import Fastify from 'fastify';
import cors from '@fastify/cors';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { env } from './config/env.js';
import { groupRoutes } from './routes/groups.js';
import { memberRoutes } from './routes/members.js';
import { categoryRoutes } from './routes/categories.js';
import { expenseRoutes } from './routes/expenses.js';
import { settlementRoutes } from './routes/settlements.js';
import { balanceRoutes } from './routes/balances.js';
import { db } from './db/connection.js';
import { categories } from './db/schema.js';
import { DEFAULT_CATEGORIES } from './routes/categories.js';
import { isNull, sql } from 'drizzle-orm';

const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

// Health check
app.get('/health', async () => ({ status: 'ok' }));

// Routes
await app.register(groupRoutes, { prefix: '/groups' });
await app.register(memberRoutes, { prefix: '/groups/:groupId/members' });
await app.register(categoryRoutes, { prefix: '/groups/:groupId/categories' });
await app.register(expenseRoutes, { prefix: '/groups/:groupId/expenses' });
await app.register(settlementRoutes, { prefix: '/groups/:groupId/settlements' });
await app.register(balanceRoutes, { prefix: '/groups/:groupId/balances' });

// Global error handler
app.setErrorHandler((error, req, reply) => {
  const statusCode = (error as any).statusCode ?? 500;
  app.log.error(error);
  reply.code(statusCode).send({
    error: error.name,
    message: error.message,
    statusCode,
  });
});

// Seed default categories on startup
async function seedDefaultCategories() {
  const existing = await db.query.categories.findFirst({
    where: isNull(categories.groupId),
  });
  if (!existing) {
    await db.insert(categories).values(DEFAULT_CATEGORIES);
    console.log('Default categories seeded.');
  }
}

async function waitForDatabase(retries = 10, delayMs = 3000): Promise<void> {
  for (let i = 1; i <= retries; i++) {
    try {
      await db.execute(sql`SELECT 1`);
      console.log('Database connection established.');
      return;
    } catch (err) {
      console.log(`Database not ready (attempt ${i}/${retries}), retrying in ${delayMs / 1000}s...`);
      if (i === retries) throw err;
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
}

try {
  await waitForDatabase();
  console.log('Running database migrations...');
  await migrate(db, { migrationsFolder: './src/db/migrations' });
  console.log('Migrations complete.');
  await seedDefaultCategories();
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
