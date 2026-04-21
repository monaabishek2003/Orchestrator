import express from 'express';

const app = express();
app.use(express.json());

app.get('/',(_req, res) => res.send('Orchestrator: ALIVE'));

const port = Number(process.env.PORT) || 8000;
app.listen(port,() => console.log(`SERVER ON PORT: ${port}`));