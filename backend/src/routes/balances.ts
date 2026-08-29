import { FastifyInstance } from 'fastify';
import { calculateBalances, simplifyDebts } from '../services/balance.service.js';

export async function balanceRoutes(app: FastifyInstance) {
  app.get<{ Params: { groupId: string }; Querystring: { month?: string } }>(
    '/',
    async (req) => {
      return calculateBalances(req.params.groupId, req.query.month);
    },
  );

  app.get<{ Params: { groupId: string }; Querystring: { month?: string } }>(
    '/settlements',
    async (req) => {
      const balances = await calculateBalances(req.params.groupId, req.query.month);
      return simplifyDebts(balances);
    },
  );
}
