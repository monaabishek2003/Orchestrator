import { Agent } from '@orchestrator/sdk';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let paused = false;

const agent = new Agent('agent-ok', {
  onControl: async ({ type, payload }) => {
    if (type === 'pause') {
      paused = true;
      console.log('[control] Agent paused by dashboard');
    } else if (type === 'resume') {
      paused = false;
      console.log('[control] Agent resumed by dashboard');
    } else if (type === 'modify_instruction') {
      console.log('[control] New instruction received:', payload);
    }
  },
});

await agent.start();
await agent.setGoal('Build Coffee Inventory Platform');
await agent.setTask('Processing data pipeline');

for (let i = 1; i <= 10; i++) {
  // Respect pause signal — wait until resumed
  while (paused) {
    await sleep(500);
  }

  await agent.setTask(`Processing batch ${i}`);
  await agent.step(`Step ${i}: processing batch ${i}`, { tokens: i * 100, cost: i * 0.002 });
  console.log(`Step ${i} done`);
  await sleep(2000);
}

await agent.end();
console.log('agent-ok finished');
