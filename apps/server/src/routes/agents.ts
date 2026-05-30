import { Router } from 'express';
import prisma from '../lib/prisma';
import { getIo } from '../socket';

const router = Router();

async function notifyWebhook(url: string | null | undefined, body: object) {
  if (!url) return;
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(3000),
    });
  } catch { /* agent not running, ignore */ }
}

// 1. Start an agent
router.post('/agent/start', async (req, res) => {
  const { name, webhookUrl } = req.body;

  const agent = await prisma.agent.create({ data: { name, webhookUrl: webhookUrl ?? null } });
  getIo().emit('agents:update');
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
  getIo().emit('agents:update');
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
  getIo().emit('agents:update');
  res.json(event);
});

// 3b. Log a warning
router.post('/agent/warn', async (req, res) => {
  const { agentId, message } = req.body;

  const event = await prisma.event.create({
    data: { agentId, type: 'warning', message },
  });
  await prisma.agent.update({
    where: { id: agentId },
    data: { lastUpdateAt: new Date() },
  });
  getIo().emit('agents:update');
  res.json(event);
});

// 4. End an agent
router.post('/agent/end', async (req, res) => {
  const { agentId } = req.body;

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'done', endedAt: new Date() },
  });
  getIo().emit('agents:update');
  res.json(agent);
});

// 5. Resolve attention flag
router.post('/agent/:id/resolve', async (req, res) => {
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { needsAttention: false, attentionReason: null },
  });
  getIo().emit('agents:update');
  res.json(agent);
});

// 6. Pause an agent
router.post('/agent/:id/pause', async (req, res) => {
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'paused', lastUpdateAt: new Date() },
  });
  await prisma.intervention.create({
    data: { agentId: req.params.id, type: 'pause' },
  });
  await prisma.event.create({
    data: { agentId: req.params.id, type: 'paused', message: 'Agent paused by user' },
  });
  getIo().emit('agents:update');
  notifyWebhook(agent.webhookUrl, { type: 'pause' });
  res.json(agent);
});

// 7. Resume an agent
router.post('/agent/:id/resume', async (req, res) => {
  const agent = await prisma.agent.update({
    where: { id: req.params.id },
    data: { status: 'running', lastUpdateAt: new Date() },
  });
  await prisma.intervention.create({
    data: { agentId: req.params.id, type: 'resume' },
  });
  await prisma.event.create({
    data: { agentId: req.params.id, type: 'resumed', message: 'Agent resumed by user' },
  });
  getIo().emit('agents:update');
  notifyWebhook(agent.webhookUrl, { type: 'resume' });
  res.json(agent);
});

// 8. Modify instruction
router.post('/agent/:id/instruction', async (req, res) => {
  const { instruction } = req.body;
  if (!instruction) return res.status(400).json({ error: 'instruction required' });

  const agent = await prisma.agent.findUnique({ where: { id: req.params.id } });
  if (!agent) return res.status(404).json({ error: 'Not Found' });

  await prisma.intervention.create({
    data: { agentId: req.params.id, type: 'modify_instruction', payload: instruction },
  });
  await prisma.event.create({
    data: { agentId: req.params.id, type: 'instruction_modified', message: instruction },
  });
  await prisma.agent.update({
    where: { id: req.params.id },
    data: { lastUpdateAt: new Date() },
  });
  getIo().emit('agents:update');
  notifyWebhook(agent.webhookUrl, { type: 'modify_instruction', payload: instruction });
  res.json({ ok: true });
});

// 9. Update agent goal/task
router.patch('/agent/:id', async (req, res) => {
  const { currentGoal, currentTask } = req.body;
  const data: Record<string, string> = {};
  if (currentGoal !== undefined) data.currentGoal = currentGoal;
  if (currentTask !== undefined) data.currentTask = currentTask;

  const agent = await prisma.agent.update({ where: { id: req.params.id }, data });
  getIo().emit('agents:update');
  res.json(agent);
});

// 10. Get all agents (includes last event for grid display)
router.get('/agents', async (_req, res) => {
  const agents = await prisma.agent.findMany({
    orderBy: { lastUpdateAt: 'desc' },
    include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
  });

  res.json(agents);
});

// 11. Get one agent + all its events + interventions
router.get('/agent/:id', async (req, res) => {
  const agentId = req.params.id;
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: {
      events: { orderBy: { timestamp: 'asc' } },
      interventions: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!agent) return res.status(404).json({ error: 'Not Found' });
  res.json(agent);
});

export default router;
