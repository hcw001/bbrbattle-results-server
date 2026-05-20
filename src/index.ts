import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerRoutes } from './api/routes.js';

const app = Fastify({ logger: true });

await app.register(cors, {
  origin: ['https://www.bbr40.com', 'http://localhost:3000'],
});

await registerRoutes(app);

const port = Number(process.env['PORT'] ?? 8000);
const host = process.env['HOST'] ?? '0.0.0.0';

await app.listen({ port, host });
