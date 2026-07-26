/* eslint-disable */
// Mock fixtures for the Orchestrator dashboard.
// Names + reasons mirror the original screenshot where possible.

const NOW = Date.now();
const MIN = 60 * 1000;
const HR  = 60 * MIN;
const DAY = 24 * HR;

const SEED_AGENTS = [
  { id: 'a1', name: 'agent-ok',         status: 'done',    lastMessage: 'Step 5: processing batch 5',   updatedAt: NOW - 4 * HR,  reason: null },
  { id: 'a2', name: 'resolve-test',     status: 'running', lastMessage: 'blew up',                       updatedAt: NOW - 4 * HR,  reason: 'No update for 12823.427s' },
  { id: 'a3', name: 'curl-test',        status: 'done',    lastMessage: 'something went wrong',          updatedAt: NOW - 4 * HR,  reason: 'something went wrong' },
  { id: 'a4', name: 'socket-test-agent',status: 'running', lastMessage: '—',                             updatedAt: NOW - 4 * HR,  reason: 'No update for 166.183s' },
  { id: 'a5', name: 'agent-stuck',      status: 'running', lastMessage: 'Step 1: starting long computation', updatedAt: NOW - 14 * DAY, reason: 'No update for 41.494s' },
  { id: 'a6', name: 'agent-error',      status: 'running', lastMessage: 'Rate limit hit',                updatedAt: NOW - 14 * DAY, reason: 'Rate limit hit' },
  { id: 'a7', name: 'agent-ok-2',       status: 'done',    lastMessage: 'Step 5: processing batch 5',    updatedAt: NOW - 14 * DAY, reason: null },
  { id: 'a8', name: 'postman-agent',    status: 'done',    lastMessage: 'this is an error in postman',   updatedAt: NOW - 21 * DAY, reason: 'this is an error in postman' },
  { id: 'a9', name: 'test-agent',       status: 'running', lastMessage: 'doing something',                updatedAt: NOW - 22 * DAY, reason: 'test-agent has been silent' },
  { id: 'a10',name: 'Planner Agent',    status: 'running', lastMessage: 'Agent started successfully',     updatedAt: NOW - 22 * DAY, reason: 'No recent step report' },
];

// Synthetic logs the detail flyout will tail.
const LOG_TEMPLATES = {
  'resolve-test': [
    ['12:04:22', 'info', 'agent booted'],
    ['12:04:23', 'info', 'connecting to orchestrator://primary'],
    ['12:04:23', 'info', 'subscribed to task.queue'],
    ['12:04:24', 'info', 'received task #8821 — analyze.batch'],
    ['12:18:51', 'warn', 'tool call timeout (45.0s) — retrying'],
    ['12:18:53', 'err',  'unhandled exception: blew up'],
  ],
  'socket-test-agent': [
    ['09:12:00', 'info', 'opening websocket → ws://gw-east-1:7443'],
    ['09:12:00', 'info', 'handshake ok'],
    ['09:14:46', 'info', 'last heartbeat ack'],
    ['09:17:32', 'warn', 'no message for 166.183s — possibly stalled'],
  ],
  'agent-error': [
    ['08:30:01', 'info', 'starting model gpt-orchestra-7b'],
    ['08:30:14', 'info', 'tool call: web.search("orchestrator pricing")'],
    ['08:30:18', 'err',  'Rate limit hit — back-off 30s'],
    ['08:30:48', 'err',  'Rate limit hit — back-off 60s'],
    ['08:31:48', 'err',  'Rate limit hit — giving up'],
  ],
  'agent-stuck': [
    ['07:00:00', 'info', 'Step 1: starting long computation'],
    ['07:00:00', 'info', 'allocating 32 workers'],
    ['07:00:41', 'warn', 'no progress reported for 41.494s'],
  ],
};

const DEFAULT_LOG = [
  ['—', 'info', 'agent booted'],
  ['—', 'info', 'awaiting task assignment'],
];

function getLogsFor(name) {
  return LOG_TEMPLATES[name] || DEFAULT_LOG;
}

function isNeedsAttention(agent) {
  return Boolean(agent.reason);
}

function statusFor(agent) {
  // status the pill should render — needs-attention agents stay running per source screenshot
  return agent.status;
}

function humanizeAgo(ts) {
  const d = Date.now() - ts;
  if (d < MIN)  return `${Math.round(d / 1000)}s ago`;
  if (d < HR)   return `about ${Math.round(d / MIN)} min ago`;
  if (d < DAY)  return `about ${Math.round(d / HR)} hours ago`;
  return `${Math.round(d / DAY)} days ago`;
}

Object.assign(window, { SEED_AGENTS, getLogsFor, isNeedsAttention, statusFor, humanizeAgo });
