import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js'; // initialize DB on startup
import ticketRoutes from './routes/tickets.js';
import plannerRoutes from './routes/planner.js';
import { startDemo, answerQuestion, resetDemo } from './demo-runner.js';
import { logger } from './logger.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(ticketRoutes);
app.use('/planner', plannerRoutes);

app.post('/demo/start', (_req, res) => {
  logger.info('API', 'POST /demo/start - initiating demo run');
  startDemo().catch((err) => logger.error('API', 'Error in demo/start', { error: err instanceof Error ? err.message : String(err) }));
  res.json({ status: 'started' });
});

app.post('/demo/answer', (req, res) => {
  const { ticketId, answer } = req.body as { ticketId: string; answer: string };
  logger.info('API', 'POST /demo/answer - resuming with PM answer', { ticketId, answerLength: answer?.length ?? 0 });
  answerQuestion(ticketId, answer).catch((err) => logger.error('API', 'Error in demo/answer', { error: err instanceof Error ? err.message : String(err) }));
  res.json({ status: 'resumed' });
});

app.post('/demo/reset', (_req, res) => {
  logger.info('API', 'POST /demo/reset - resetting demo state');
  resetDemo().catch((err) => logger.error('API', 'Error in demo/reset', { error: err instanceof Error ? err.message : String(err) }));
  res.json({ status: 'reset' });
});

app.listen(PORT, () => {
  logger.info('SERVER', '═══════════════════════════════════════════════════════');
  logger.info('SERVER', `🚀 Demo server running on http://localhost:${PORT}`);
  logger.info('SERVER', '═══════════════════════════════════════════════════════');
});
