import prisma from '../lib/prisma';
import { STUCK_CHECK_INTERVAL_MS, STUCK_INTERVAL_THRESHHOLD } from '../config';

export function startStuckMonitor() {
  return setInterval(async () => {
    const runningAgents = await prisma.agent.findMany({
      where: { status: 'running', needsAttention: false },
      include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } },
    });

    for (const agent of runningAgents) {
      const now = new Date().getTime();
      const lastUpdated = new Date(agent.lastUpdateAt).getTime();

      if (now - lastUpdated > STUCK_INTERVAL_THRESHHOLD) {
        const lastMessage = agent.events[0]?.message?.toLowerCase() ?? '';
        let reason = `No update for ${Math.round(now - lastUpdated) / 1000}s`;

        if (
          lastMessage.includes('search') ||
          lastMessage.includes('fetch') ||
          lastMessage.includes('request')
        ) {
          reason = 'Possibly waiting on API';
        } else if (lastMessage.includes('compile') || lastMessage.includes('build')) {
          reason = 'Build may have hung';
        } else if (
          lastMessage.includes('wait') ||
          lastMessage.includes('input') ||
          lastMessage.includes('approval')
        ) {
          reason = 'Awaiting user input';
        }

        await prisma.agent.update({
          where: { id: agent.id },
          data: { needsAttention: true, attentionReason: reason },
        });

        console.log(`[ATTENTION} flagged agent ${agent.name}: ${reason}`);
      }
    }
  }, STUCK_CHECK_INTERVAL_MS);
}
