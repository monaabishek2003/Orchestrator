import express from 'express';
import cors from 'cors';
import './db.js'; // initialize DB on startup

// TODO: create this file
// import ticketRoutes from './routes/tickets.js';

// TODO: create this file
// import plannerRoutes from './routes/planner.js';

const app = express();
const PORT = 3001;

app.use(cors({ origin: '*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// app.use('/', ticketRoutes);
// app.use('/planner', plannerRoutes);

app.listen(PORT, () => {
  console.log(`Demo server running on http://localhost:${PORT}`);
});
