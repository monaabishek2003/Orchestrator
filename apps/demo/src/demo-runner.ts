import { Agent } from 'orchestrator-sdk';
import { getAllTickets, getTicketBySort, updateTicket, deleteAllTickets } from './db.js';
import { DEMO_SCRIPTS } from './demo-scripts.js';
import { logger } from './logger.js';

const TIMING = {
  STEP_DELAY: 3000,       // ms between each reasoning step
  TICKET_GAP: 2000,       // ms gap between tickets
  PLAN_REVEAL_DELAY: 800, // ms between each ticket appearing on the kanban (not used server-side)
};

let demoRunning = false;
let pausedState: { ticketSortOrder: number; agentInstance: Agent } | null = null;

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function runTicket(sortOrder: number): Promise<void> {
  const script = DEMO_SCRIPTS[sortOrder];
  if (!script) {
    logger.warn('RUNNER', 'No script found for ticket', { sortOrder });
    return;
  }

  const ticket = getTicketBySort(sortOrder);
  if (!ticket) {
    logger.warn('RUNNER', 'No ticket found in DB', { sortOrder });
    return;
  }

  logger.info('RUNNER', `🎫 Starting ticket #${sortOrder}: ${ticket.title}`, { role: script.role });
  updateTicket(ticket.id, { status: 'in_progress' });

  const agent = new Agent(script.agentName, 'http://localhost:8000');
  logger.debug('RUNNER', `Initializing agent: ${script.agentName}`);
  await agent.start();

  for (let i = 0; i < script.steps.length; i++) {
    logger.debug('RUNNER', `⏱️  Waiting ${TIMING.STEP_DELAY}ms before step ${i + 1}/${script.steps.length}`);
    await delay(TIMING.STEP_DELAY);
    logger.info('RUNNER', `📝 Step ${i + 1}/${script.steps.length}: ${script.steps[i].substring(0, 60)}...`);
    await agent.step(script.steps[i]);
  }

  if (script.needsInput) {
    logger.warn('RUNNER', `⏸️  Ticket #${sortOrder} needs PM input - pausing demo`, { question: script.needsInput.question.substring(0, 80) + '...' });
    updateTicket(ticket.id, {
      status: 'needs_input',
      question: script.needsInput.question,
    });
    pausedState = { ticketSortOrder: sortOrder, agentInstance: agent };
    return; // pause — wait for answerQuestion()
  }

  logger.info('RUNNER', `✅ Ticket #${sortOrder} complete - ending agent`);
  await agent.end();
  updateTicket(ticket.id, { status: 'done' });
  logger.debug('RUNNER', `⏱️  Waiting ${TIMING.TICKET_GAP}ms before next ticket`);
  await delay(TIMING.TICKET_GAP);
}

async function runRemainingTickets(): Promise<void> {
  logger.info('RUNNER', '🚀 Phase 4: Running remaining tickets (5-6)');
  try {
    await runTicket(5);
  } catch (err) {
    logger.error('RUNNER', 'Error in ticket 5', { error: err instanceof Error ? err.message : String(err) });
  }
  try {
    await runTicket(6);
  } catch (err) {
    logger.error('RUNNER', 'Error in ticket 6', { error: err instanceof Error ? err.message : String(err) });
  }
  logger.info('RUNNER', '🎉 Demo complete - all tickets processed');
  demoRunning = false;
}

export async function startDemo(): Promise<void> {
  logger.info('RUNNER', '═══════════════════════════════════════');
  logger.info('RUNNER', '🚀 Starting demo run');
  logger.info('RUNNER', '═══════════════════════════════════════');
  demoRunning = true;
  pausedState = null;

  try {
    logger.info('RUNNER', '🚀 Phase 1: Backend foundation (ticket 1)');
    await runTicket(1);

    logger.info('RUNNER', '🚀 Phase 2: Parallel development (tickets 2-3)');
    const t2 = getTicketBySort(2);
    const t3 = getTicketBySort(3);
    if (t2) {
      updateTicket(t2.id, { status: 'in_progress' });
      logger.debug('RUNNER', 'Pre-marked ticket 2 as in_progress for parallel UI feel');
    }
    if (t3) {
      updateTicket(t3.id, { status: 'in_progress' });
      logger.debug('RUNNER', 'Pre-marked ticket 3 as in_progress for parallel UI feel');
    }
    await runTicket(2);
    await runTicket(3);

    logger.info('RUNNER', '🚀 Phase 3: Dashboard feature (ticket 4)');
    await runTicket(4);

    if (!pausedState) {
      await runRemainingTickets();
    } else {
      logger.info('RUNNER', '⏸️  Demo paused - waiting for PM input');
    }
  } catch (err) {
    logger.error('RUNNER', 'Fatal error in startDemo', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    demoRunning = false;
  }
}

export async function answerQuestion(ticketId: string, answer: string): Promise<void> {
  logger.info('RUNNER', '▶️  Resuming demo with PM answer', { ticketId, answerLength: answer.length });
  updateTicket(ticketId, { answer, status: 'in_progress' });

  if (!pausedState) {
    logger.warn('RUNNER', 'No paused state found - demo may have been reset');
    return;
  }

  const { ticketSortOrder, agentInstance } = pausedState;
  const script = DEMO_SCRIPTS[ticketSortOrder];
  pausedState = null;

  try {
    const afterSteps = script.needsInput?.afterAnswer ?? [];
    logger.info('RUNNER', `Completing ticket #${ticketSortOrder} with ${afterSteps.length} remaining steps`);
    for (let i = 0; i < afterSteps.length; i++) {
      logger.debug('RUNNER', `⏱️  Waiting ${TIMING.STEP_DELAY}ms before step ${i + 1}/${afterSteps.length}`);
      await delay(TIMING.STEP_DELAY);
      logger.info('RUNNER', `📝 Step ${i + 1}/${afterSteps.length}: ${afterSteps[i].substring(0, 60)}...`);
      await agentInstance.step(afterSteps[i]);
    }
    logger.info('RUNNER', `✅ Ticket #${ticketSortOrder} complete - ending agent`);
    await agentInstance.end();
    updateTicket(ticketId, { status: 'done' });
    logger.debug('RUNNER', `⏱️  Waiting ${TIMING.TICKET_GAP}ms before resuming`);
    await delay(TIMING.TICKET_GAP);

    await runRemainingTickets();
  } catch (err) {
    logger.error('RUNNER', 'Error in answerQuestion', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
    demoRunning = false;
  }
}

export async function resetDemo(): Promise<void> {
  logger.info('RUNNER', '🔄 Resetting demo - clearing all state');
  demoRunning = false;
  pausedState = null;
  deleteAllTickets();
  logger.info('RUNNER', 'Demo reset complete');
}
