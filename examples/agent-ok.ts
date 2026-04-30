import { Agent } from '@orchestrator/sdk';

const agent = new Agent('agent-ok');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

await agent.start();

for (let i = 1; i <= 5; i++) {
  await agent.step(`Step ${i}: processing batch ${i}`, { tokens: i * 100, cost: i * 0.002 });
  await sleep(1500);
}

await agent.end();
console.log('agent-ok finished');
