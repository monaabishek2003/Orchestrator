#!/usr/bin/env node
import http from 'http';
import path from 'path';
import fs from 'fs';
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

// Serve static dashboard only if public/ exists (production build)
const publicDir = path.join(import.meta.dirname, '..', 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
}

startStuckMonitor();

const port = Number(process.env.PORT) || 8000;
httpServer.listen(port, () => console.log(`Orchestrator server running on http://localhost:${port}`));
