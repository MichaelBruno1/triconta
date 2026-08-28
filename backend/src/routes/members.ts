import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { members, expenses, expenseSplits } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { NotFoundError, ConflictError } from '../utils/errors.js';

const createMemberSchema = z.object({
  name: z.string().min(1).max(255),
});

export async function memberRoutes(app: FastifyInstance) {
  // List members
  app.get<{ Params: { groupId: string } }>('/', async (req) => {
    return db.query.members.findMany({
      where: eq(members.groupId, req.params.groupId),
      orderBy: (members, { asc }) => [asc(members.createdAt)],
    });
  });

  // Add member
  app.post<{ Params: { groupId: string } }>('/', async (req, reply) => {
    const body = createMemberSchema.parse(req.body);
    const [member] = await db
      .insert(members)
      .values({ ...body, groupId: req.params.groupId })
      .returning();
    reply.code(201);
    return member;
  });

  // Update member
  app.put<{ Params: { groupId: string; id: string } }>('/:id', async (req) => {
    const body = createMemberSchema.parse(req.body);
    const [member] = await db
      .update(members)
      .set(body)
      .where(and(eq(members.id, req.params.id), eq(members.groupId, req.params.groupId)))
      .returning();
    if (!member) throw new NotFoundError('Member not found');
    return member;
  });

  // Delete member
  app.delete<{ Params: { groupId: string; id: string } }>('/:id', async (req, reply) => {
    const hasSplits = await db.query.expenseSplits.findFirst({
      where: eq(expenseSplits.memberId, req.params.id),
    });
    const hasPaid = await db.query.expenses.findFirst({
      where: eq(expenses.paidById, req.params.id),
    });
    if (hasSplits || hasPaid) {
      throw new ConflictError('Cannot delete member with associated expenses');
    }
    await db
      .delete(members)
      .where(and(eq(members.id, req.params.id), eq(members.groupId, req.params.groupId)));
    reply.code(204);
  });
}
