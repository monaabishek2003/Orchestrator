import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { logger } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dataDir = join(__dirname, '../data');
mkdirSync(dataDir, { recursive: true });

const dbPath = join(dataDir, 'demo.db');
logger.info('DATABASE', `Initializing SQLite database at ${dbPath}`);
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'backlog',
    assignedRole TEXT,
    agentRunId TEXT,
    question TEXT,
    answer TEXT,
    sortOrder INTEGER NOT NULL DEFAULT 0,
    createdAt TEXT NOT NULL DEFAULT (datetime('now')),
    updatedAt TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
logger.info('DATABASE', 'Tickets table initialized');

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedRole: string | null;
  agentRunId: string | null;
  question: string | null;
  answer: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export function getAllTickets(): Ticket[] {
  const tickets = db.prepare('SELECT * FROM tickets ORDER BY sortOrder ASC').all() as Ticket[];
  logger.debug('DATABASE', `getAllTickets() -> ${tickets.length} tickets`);
  return tickets;
}

export function getTicket(id: string): Ticket | undefined {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(id) as Ticket | undefined;
  logger.debug('DATABASE', `getTicket(${id}) -> ${ticket ? 'found' : 'not found'}`);
  return ticket;
}

export function createTicket(data: {
  title: string;
  description: string;
  assignedRole?: string;
  sortOrder: number;
}): Ticket {
  const id = crypto.randomUUID();
  logger.info('DATABASE', `Creating ticket #${data.sortOrder}: ${data.title}`, { role: data.assignedRole });
  db.prepare(`
    INSERT INTO tickets (id, title, description, assignedRole, sortOrder)
    VALUES (?, ?, ?, ?, ?)
  `).run(id, data.title, data.description, data.assignedRole ?? null, data.sortOrder);
  return getTicket(id)!;
}

export function updateTicket(
  id: string,
  data: Partial<Omit<Ticket, 'id' | 'createdAt'>>
): Ticket | undefined {
  const fields = Object.keys(data) as (keyof typeof data)[];
  if (fields.length === 0) return getTicket(id);

  logger.debug('DATABASE', `Updating ticket ${id}`, { fields: fields.join(', '), status: data.status });
  const setClauses = fields.map((f) => `${f} = ?`).join(', ');
  const values = fields.map((f) => data[f] ?? null);

  db.prepare(`
    UPDATE tickets
    SET ${setClauses}, updatedAt = datetime('now')
    WHERE id = ?
  `).run(...values, id);

  return getTicket(id);
}

export function deleteAllTickets(): void {
  const count = db.prepare('SELECT COUNT(*) as count FROM tickets').get() as { count: number };
  logger.info('DATABASE', `Deleting all tickets`, { count: count.count });
  db.prepare('DELETE FROM tickets').run();
}

export function getTicketBySort(sortOrder: number): Ticket | undefined {
  const ticket = db
    .prepare('SELECT * FROM tickets WHERE sortOrder = ?')
    .get(sortOrder) as Ticket | undefined;
  logger.debug('DATABASE', `getTicketBySort(${sortOrder}) -> ${ticket ? ticket.title : 'not found'}`);
  return ticket;
}

export default db;
