import { Router } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// 1. Start an agent
router.post('/agent/start', async (req, res) => {
  const { name } = req.body;

  const agent = await prisma.agent.create({ data: { name } });

  res.json(agent);
});

// 2. Log a step
router.post('/agent/step', async (req, res) => {
  const { agentId, message, tokens, cost } = req.body;

  const event = await prisma.event.create({
    data: { agentId, type: 'info', message, tokens, cost },
  });
  await prisma.agent.update({
    where: { id: agentId },
    data: { lastUpdateAt: new Date() },
  });

  res.json(event);
});

// 3. Log an error
router.post('/agent/error', async (req, res) => {
  const { agentId, message } = req.body;

  const event = await prisma.event.create({
    data: { agentId, type: 'error', message },
  });
  await prisma.agent.update({
    where: { id: agentId },
    data: { needsAttention: true, attentionReason: message },
  });

  res.json(event);
});

// 4. End an agent
router.post('/agent/end', async (req, res) => {
  const { agentId } = req.body;

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'done', endedAt: new Date() },
  });

  res.json(agent);
});

// 5. Get all agents
router.get('/agents', async (_req, res) => {
  const agents = await prisma.agent.findMany({ orderBy: { createdAt: 'desc' } });

  res.json(agents);
});

// 6. Get one agent + all its events
router.get('/agent/:id', async (req, res) => {
  const agentId = req.params.id;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { events: { orderBy: { timestamp: 'asc' } } },
  });

  if (!agent) return res.status(404).json({ error: 'Not Found' });
  res.json(agent);
});

export default router;
