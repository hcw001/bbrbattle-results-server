import type { FastifyInstance } from 'fastify';
import { BattleRequestSchema, SimulateRequestSchema } from './schemas.js';
import { runSingleBattle, runSimulation } from './simulation.js';
import { runLegacySimulation } from './legacyAdapter.js';

export async function registerRoutes(app: FastifyInstance): Promise<void> {
  // POST /battles — single deterministic battle
  app.post('/battles', async (request, reply) => {
    const parsed = BattleRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ error: parsed.error.format() });
    }

    const result = runSingleBattle(parsed.data);
    return reply.status(200).send(result);
  });

  // POST /battles/simulate — Monte Carlo simulation
  app.post('/battles/simulate', async (request, reply) => {
    const parsed = SimulateRequestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(422).send({ error: parsed.error.format() });
    }

    const result = runSimulation(parsed.data);
    return reply.status(200).send(result);
  });

  // Health check
  app.get('/health', async (_request, reply) => {
    return reply.status(200).send({ ok: true });
  });

  // Legacy compatibility — matches the existing POST /api/calculate endpoint
  // used by the bbr40.com frontend.
  app.post('/api/calculate', async (request, reply) => {
    if (request.method === 'OPTIONS') return reply.status(200).send('');

    try {
      const body = request.body as Record<string, unknown>;
      const legacyReq = {
        terrain: body['terrain'] as 'land' | 'sea',
        attackerTech: body['attackerTech'],
        defenderTech: body['defenderTech'],
        attackerUnits: (body['attackerUnits'] ?? {}) as Record<string, number>,
        defenderUnits: (body['defenderUnits'] ?? {}) as Record<string, number>,
        ...(body['attackerSubAssignments'] !== undefined && {
          attackerSubAssignments: body['attackerSubAssignments'] as Record<string, string>,
        }),
        ...(body['defenderSubAssignments'] !== undefined && {
          defenderSubAssignments: body['defenderSubAssignments'] as Record<string, string>,
        }),
        ...(body['targetSelectAssignments'] !== undefined && {
          targetSelectAssignments: body['targetSelectAssignments'] as Record<string, string>,
        }),
      };
      const outputs = runLegacySimulation(legacyReq);

      return reply.status(200).send({ code: 1, message: 'OK', outputs });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(200).send({ code: 0, message, outputs: {} });
    }
  });
}
