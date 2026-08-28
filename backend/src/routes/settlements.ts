import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { settlements } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';

const createSettlementSchema = z.object({
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  settlementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(500).optional(),
});

export async function settlementRoutes(app: FastifyInstance) {
  app.get<{ Params: { groupId: string } }>('/', async (req) => {
    return db.query.settlements.findMany({
      where: eq(settlements.groupId, req.params.groupId),
      with: { fromMember: true, toMember: true },
      orderBy: (s, { desc }) => [desc(s.settlementDate), desc(s.createdAt)],
    });
  });

  app.post<{ Params: { groupId: string } }>('/', async (req, reply) => {
    const body = createSettlementSchema.parse(req.body);
    const [settlement] = await db
      .insert(settlements)
      .values({ ...body, groupId: req.params.groupId })
      .returning();
    reply.code(201);
    return settlement;
  });

  app.delete<{ Params: { groupId: string; id: string } }>('/:id', async (req, reply) => {
    await db
      .delete(settlements)
      .where(and(eq(settlements.id, req.params.id), eq(settlements.groupId, req.params.groupId)));
    reply.code(204);
  });
}
