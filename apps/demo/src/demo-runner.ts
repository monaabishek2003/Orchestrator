import { Agent } from 'orchestrator-sdk';
import { getAllTickets, getTicketBySort, updateTicket, deleteAllTickets } from './db.js';
import { DEMO_SCRIPTS } from './demo-scripts.js';

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
  if (!script) return;

  const ticket = getTicketBySort(sortOrder);
  if (!ticket) return;

  updateTicket(ticket.id, { status: 'in_progress' });

  const agent = new Agent(script.agentName, 'http://localhost:8000');
  await agent.start();

  for (const stepMessage of script.steps) {
    await delay(TIMING.STEP_DELAY);
    await agent.step(stepMessage);
  }

  if (script.needsInput) {
    updateTicket(ticket.id, {
      status: 'needs_input',
      question: script.needsInput.question,
    });
    pausedState = { ticketSortOrder: sortOrder, agentInstance: agent };
    return; // pause — wait for answerQuestion()
  }

  await agent.end();
  updateTicket(ticket.id, { status: 'done' });
  await delay(TIMING.TICKET_GAP);
}

async function runRemainingTickets(): Promise<void> {
  try {
    await runTicket(5);
  } catch (err) {
    console.error('[demo-runner] Error in ticket 5:', err);
  }
  try {
    await runTicket(6);
  } catch (err) {
    console.error('[demo-runner] Error in ticket 6:', err);
  }
  demoRunning = false;
}

export async function startDemo(): Promise<void> {
  demoRunning = true;
  pausedState = null;

  try {
    // Phase 1: ticket 1 alone
    await runTicket(1);

    // Phase 2: tickets 2 + 3 — set both in_progress first for parallel kanban feel, then run sequentially
    const t2 = getTicketBySort(2);
    const t3 = getTicketBySort(3);
    if (t2) updateTicket(t2.id, { status: 'in_progress' });
    if (t3) updateTicket(t3.id, { status: 'in_progress' });
    await runTicket(2);
    await runTicket(3);

    // Phase 3: ticket 4 — may pause at needs_input
    await runTicket(4);

    // If ticket 4 had needsInput, runTicket() returned early and we're paused.
    // runRemainingTickets() will be called from answerQuestion() instead.
    if (!pausedState) {
      await runRemainingTickets();
    }
  } catch (err) {
    console.error('[demo-runner] Error in startDemo:', err);
    demoRunning = false;
  }
}

export async function answerQuestion(ticketId: string, answer: string): Promise<void> {
  updateTicket(ticketId, { answer, status: 'in_progress' });

  if (!pausedState) return;

  const { ticketSortOrder, agentInstance } = pausedState;
  const script = DEMO_SCRIPTS[ticketSortOrder];
  pausedState = null;

  try {
    const afterSteps = script.needsInput?.afterAnswer ?? [];
    for (const stepMessage of afterSteps) {
      await delay(TIMING.STEP_DELAY);
      await agentInstance.step(stepMessage);
    }
    await agentInstance.end();
    updateTicket(ticketId, { status: 'done' });
    await delay(TIMING.TICKET_GAP);

    // Continue with phase 4 tickets
    await runRemainingTickets();
  } catch (err) {
    console.error('[demo-runner] Error in answerQuestion:', err);
    demoRunning = false;
  }
}

export async function resetDemo(): Promise<void> {
  demoRunning = false;
  pausedState = null;
  deleteAllTickets();
}
