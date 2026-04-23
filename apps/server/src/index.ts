import express from 'express';
import prisma from './lib/prisma';
import { off } from 'node:cluster';
import { AgentScalarFieldEnum } from './generated/prisma/internal/prismaNamespace';

const app = express();
app.use(express.json());

const STUCK_INTERVAL_THRESHHOLD  = 40 * 1000;


// 1.Start an agent
app.post('/agent/start', async (req, res) => {
  const { name } = req.body;

  const agent = await prisma.agent.create({ data : {name}});

  res.json(agent);
});

// 2.Log a step
app.post('/agent/step', async (req, res) => {
  
  const { agentId, message, tokens, cost } = req.body;

  const event = await prisma.event.create({
    data: { agentId, type: 'info', message, tokens, cost }
  });
  await prisma.agent.update({
    where: { id: agentId },
    data: { lastUpdateAt: new Date()},
  });

  res.json(event);
});

// 3.Log a error
app.post('/agent/error', async (req, res) => {
  const { agentId, message } = req.body;

  const event = await prisma.event.create({
    data: { agentId, type: 'error', message},
  });
  await prisma.agent.update({
    where: { id: agentId },
    data: { needsAttention: true, attentionReason: message}
  });
  
  res.json(event);
});

// 4. End an agent
app.post('/agent/end', async (req, res) => {
  const { agentId } = req.body;

  const agent = await prisma.agent.update({
    where: { id: agentId },
    data: { status: 'done', endedAt: new Date()},
  })

  res.json(agent);
});

// 5. Get all agents
app.get('/agents', async (req, res) => {

  const agents = await prisma.agent.findMany({ orderBy : { createdAt: 'desc'}});

  res.json(agents);
});

// 6. Get one agent + all its events
app.get('/agent/:id', async (req, res) => {
  const agentId = req.params.id
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    include: { events: {orderBy: {timestamp: 'asc'}}},
  })

  if(!agent) return res.status(404).json({error: "Not Found"});
  res.json(agent);
});

setInterval(async () => {
  const runningAgents = await prisma.agent.findMany({
    where: { status: "running", needsAttention: false},
    include: { events: { orderBy: { timestamp: "desc"}, take: 1}}
  })
  

  for(const agent of runningAgents){
    const now = new Date().getTime();
    const lastUpdated = new Date(agent.lastUpdateAt).getTime();

    if(now - lastUpdated > STUCK_INTERVAL_THRESHHOLD){
      const lastMessage = agent.events[0]?.message?.toLowerCase() ?? "";
      let reason = `No update for ${Math.round(now-lastUpdated) / 1000}s`;

      if (lastMessage.includes('search') || lastMessage.includes('fetch') || lastMessage.includes('request')) {
        reason = 'Possibly waiting on API';
      } else if (lastMessage.includes('compile') || lastMessage.includes('build')) {
        reason = 'Build may have hung';
      } else if (lastMessage.includes('wait') || lastMessage.includes('input') || lastMessage.includes('approval')) {
        reason = 'Awaiting user input';
      }

      await prisma.agent.update({
        where: { id: agent.id},
        data : { needsAttention: true, attentionReason: reason}
      })

      console.log(`[ATTENTION} flagged agent ${agent.name}: ${reason}`);
    }
  }
},5000)

const port = Number(process.env.PORT) || 8000;
app.listen(port, () => console.log(`Server on: ${port}`));