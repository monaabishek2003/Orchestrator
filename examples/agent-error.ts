import { Agent } from '@orchestrator/sdk';

const agent = new Agent('agent-error');

await agent.start();
await agent.step('Step 1: fetching data');
await agent.step('Step 2: calling external API');
await agent.error('Rate limit hit');
console.log('agent-error finished');
