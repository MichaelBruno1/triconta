import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { groups, members, expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError } from '../utils/errors.js';

const createGroupSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
});

const updateGroupSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
});

export async function groupRoutes(app: FastifyInstance) {
  // List all groups
  app.get('/', async () => {
    const allGroups = await db.query.groups.findMany({
      with: { members: true },
      orderBy: (groups, { desc }) => [desc(groups.createdAt)],
    });
    return allGroups;
  });

  // Get group by id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const group = await db.query.groups.findFirst({
      where: eq(groups.id, req.params.id),
      with: { members: true, categories: true },
    });
    if (!group) throw new NotFoundError('Group not found');
    return group;
  });

  // Create group
  app.post('/', async (req, reply) => {
    const body = createGroupSchema.parse(req.body);
    const [group] = await db.insert(groups).values(body).returning();
    reply.code(201);
    return group;
  });

  // Update group
  app.put<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const body = updateGroupSchema.parse(req.body);
    const [group] = await db
      .update(groups)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(groups.id, req.params.id))
      .returning();
    if (!group) throw new NotFoundError('Group not found');
    return group;
  });

  // Delete group
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    await db.delete(groups).where(eq(groups.id, req.params.id));
    reply.code(204);
  });
}
