import http from 'http';
import express from 'express';
import cors from 'cors';
import agentsRouter from './routes/agents';
import { startStuckMonitor } from './jobs/stuck-monitor';
import { initSocket } from './socket';

const app = express();
const httpServer = http.createServer(app);
initSocket(httpServer);

app.use(cors());
app.use(express.json());
app.use(agentsRouter);

startStuckMonitor();

const port = Number(process.env.PORT) || 8000;
httpServer.listen(port, () => console.log(`Server on: ${port}`));