import { FastifyInstance } from 'fastify';
import { calculateBalances, simplifyDebts } from '../services/balance.service.js';

export async function balanceRoutes(app: FastifyInstance) {
  app.get<{ Params: { groupId: string } }>('/', async (req) => {
    return calculateBalances(req.params.groupId);
  });

  app.get<{ Params: { groupId: string } }>('/settlements', async (req) => {
    const balances = await calculateBalances(req.params.groupId);
    return simplifyDebts(balances);
  });
}
