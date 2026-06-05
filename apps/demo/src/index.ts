import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import './db.js'; // initialize DB on startup
import ticketRoutes from './routes/tickets.js';
import plannerRoutes from './routes/planner.js';
import { startDemo, answerQuestion, resetDemo } from './demo-runner.js';

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
  startDemo().catch((err) => console.error('[demo/start]', err));
  res.json({ status: 'started' });
});

app.post('/demo/answer', (req, res) => {
  const { ticketId, answer } = req.body as { ticketId: string; answer: string };
  answerQuestion(ticketId, answer).catch((err) => console.error('[demo/answer]', err));
  res.json({ status: 'resumed' });
});

app.post('/demo/reset', (_req, res) => {
  resetDemo().catch((err) => console.error('[demo/reset]', err));
  res.json({ status: 'reset' });
});

app.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
});
