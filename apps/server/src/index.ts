import express from 'express';
import agentsRouter from './routes/agents';
import { startStuckMonitor } from './jobs/stuck-monitor';

const app = express();
app.use(express.json());
app.use(agentsRouter);

startStuckMonitor();

const port = Number(process.env.PORT) || 8000;
app.listen(port, () => console.log(`Server on: ${port}`));