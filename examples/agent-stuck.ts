import { Agent } from '@orchestrator/sdk';

const agent = new Agent('agent-stuck');

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

await agent.start();
await agent.step('Step 1: starting long computation');

// Simulate a stuck agent — attention engine flags at 45s
await sleep(120_000);
console.log('agent-stuck finished');
