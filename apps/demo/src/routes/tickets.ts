import { Router } from 'express';
import {
  getAllTickets,
  getTicket,
  updateTicket,
  deleteAllTickets,
} from '../db.js';
import { logger } from '../logger.js';

const router = Router();

router.get('/tickets', (_req, res) => {
  const tickets = getAllTickets();
  logger.debug('TICKETS', `GET /tickets - returning ${tickets.length} tickets`);
  res.json(tickets);
});

router.get('/tickets/:id', (req, res) => {
  logger.debug('TICKETS', `GET /tickets/${req.params.id}`);
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    logger.warn('TICKETS', `Ticket not found: ${req.params.id}`);
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

router.patch('/tickets/:id', (req, res) => {
  logger.info('TICKETS', `PATCH /tickets/${req.params.id}`, { fields: Object.keys(req.body) });
  const updated = updateTicket(req.params.id, req.body);
  if (!updated) {
    logger.warn('TICKETS', `Ticket not found for update: ${req.params.id}`);
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  logger.debug('TICKETS', `Updated ticket ${req.params.id}`, { status: updated.status });
  res.json(updated);
});

router.delete('/tickets', (_req, res) => {
  logger.info('TICKETS', 'DELETE /tickets - deleting all tickets');
  deleteAllTickets();
  res.json({ ok: true });
});

export default router;
