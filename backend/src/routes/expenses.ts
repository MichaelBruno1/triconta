import { FastifyInstance } from 'fastify';
import { db } from '../db/connection.js';
import { expenses, expenseSplits } from '../db/schema.js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { z } from 'zod';
import { createExpenseWithSplits } from '../services/expense.service.js';
import { NotFoundError } from '../utils/errors.js';

const splitSchema = z.object({
  memberId: z.string().uuid(),
  amountCents: z.number().int().positive(),
  percentage: z.number().optional(),
});

const createExpenseSchema = z.object({
  paidById: z.string().uuid(),
  description: z.string().min(1).max(500),
  amountCents: z.number().int().positive(),
  expenseDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().uuid().optional(),
  splitType: z.enum(['equal', 'percentage', 'exact']).default('equal'),
  installments: z.number().int().min(2).max(360).optional().nullable(),
  participantIds: z.array(z.string().uuid()).optional(),
  splits: z.array(splitSchema).optional(),
});

export async function expenseRoutes(app: FastifyInstance) {
  // List expenses with filters
  app.get<{ Params: { groupId: string }; Querystring: { categoryId?: string; memberId?: string; startDate?: string; endDate?: string } }>(
    '/',
    async (req) => {
      return db.query.expenses.findMany({
        where: eq(expenses.groupId, req.params.groupId),
        with: { paidBy: true, splits: { with: { member: true } }, category: true },
        orderBy: (expenses, { desc }) => [desc(expenses.expenseDate), desc(expenses.createdAt)],
      });
    }
  );

  // Get expense by id
  app.get<{ Params: { groupId: string; id: string } }>('/:id', async (req) => {
    const expense = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, req.params.id), eq(expenses.groupId, req.params.groupId)),
      with: { paidBy: true, splits: { with: { member: true } }, category: true },
    });
    if (!expense) throw new NotFoundError('Expense not found');
    return expense;
  });

  // Create expense
  app.post<{ Params: { groupId: string } }>('/', async (req, reply) => {
    const body = createExpenseSchema.parse(req.body);
    const expense = await createExpenseWithSplits({ ...body, groupId: req.params.groupId });
    reply.code(201);
    return expense;
  });

  // Update expense — delete splits and recreate
  app.put<{ Params: { groupId: string; id: string } }>('/:id', async (req) => {
    const body = createExpenseSchema.parse(req.body);
    const existing = await db.query.expenses.findFirst({
      where: and(eq(expenses.id, req.params.id), eq(expenses.groupId, req.params.groupId)),
    });
    if (!existing) throw new NotFoundError('Expense not found');

    await db.delete(expenseSplits).where(eq(expenseSplits.expenseId, req.params.id));
    await db
      .update(expenses)
      .set({ ...body, groupId: req.params.groupId, updatedAt: new Date() })
      .where(eq(expenses.id, req.params.id));

    const updated = await createExpenseWithSplits({
      ...body,
      groupId: req.params.groupId,
    });
    return updated;
  });

  // Delete expense
  app.delete<{ Params: { groupId: string; id: string } }>('/:id', async (req, reply) => {
    await db
      .delete(expenses)
      .where(and(eq(expenses.id, req.params.id), eq(expenses.groupId, req.params.groupId)));
    reply.code(204);
  });
}
