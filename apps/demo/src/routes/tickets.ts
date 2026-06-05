import { Router } from 'express';
import {
  getAllTickets,
  getTicket,
  updateTicket,
  deleteAllTickets,
} from '../db.js';

const router = Router();

router.get('/tickets', (_req, res) => {
  res.json(getAllTickets());
});

router.get('/tickets/:id', (req, res) => {
  const ticket = getTicket(req.params.id);
  if (!ticket) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(ticket);
});

router.patch('/tickets/:id', (req, res) => {
  const updated = updateTicket(req.params.id, req.body);
  if (!updated) {
    res.status(404).json({ error: 'Ticket not found' });
    return;
  }
  res.json(updated);
});

router.delete('/tickets', (_req, res) => {
  deleteAllTickets();
  res.json({ ok: true });
});

export default router;
