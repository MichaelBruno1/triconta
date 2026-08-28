import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { categories } from '../db/schema.js';
import { eq, or, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { ConflictError } from '../utils/errors.js';

const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(10).default('💰'),
});

export const DEFAULT_CATEGORIES = [
  { name: 'Alimentação', icon: '🍕', isDefault: true },
  { name: 'Transporte', icon: '🚗', isDefault: true },
  { name: 'Moradia', icon: '🏠', isDefault: true },
  { name: 'Lazer', icon: '🎉', isDefault: true },
  { name: 'Saúde', icon: '💊', isDefault: true },
  { name: 'Educação', icon: '📚', isDefault: true },
  { name: 'Compras', icon: '🛍️', isDefault: true },
  { name: 'Outros', icon: '💰', isDefault: true },
];

export async function categoryRoutes(app: FastifyInstance) {
  // List categories (global + group-specific)
  app.get<{ Params: { groupId: string } }>('/', async (req) => {
    return db.query.categories.findMany({
      where: or(isNull(categories.groupId), eq(categories.groupId, req.params.groupId)),
      orderBy: (categories, { asc }) => [asc(categories.name)],
    });
  });

  // Create custom category
  app.post<{ Params: { groupId: string } }>('/', async (req, reply) => {
    const body = createCategorySchema.parse(req.body);
    const [category] = await db
      .insert(categories)
      .values({ ...body, groupId: req.params.groupId, isDefault: false })
      .returning();
    reply.code(201);
    return category;
  });

  // Delete custom category
  app.delete<{ Params: { groupId: string; id: string } }>('/:id', async (req, reply) => {
    const category = await db.query.categories.findFirst({
      where: eq(categories.id, req.params.id),
    });
    if (category?.isDefault) {
      throw new ConflictError('Cannot delete default category');
    }
    await db.delete(categories).where(eq(categories.id, req.params.id));
    reply.code(204);
  });
}
