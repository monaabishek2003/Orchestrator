import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { createTicket } from '../db.js';
import { logger } from '../logger.js';

const router = Router();

const PLANNER_SYSTEM_PROMPT = `You are a technical project planner. Given a product requirements document (PRD), break it into exactly 6 implementation tickets for a small development team with a Frontend Agent and a Backend Agent.

Return ONLY valid JSON — no markdown fences, no commentary, no explanation. Just the JSON object.

Schema:
{
  "tickets": [
    {
      "title": "string — concise ticket title, 3-8 words",
      "description": "string — 2-3 sentences describing what to implement. Be specific about endpoints, components, or data models.",
      "assignedRole": "frontend" | "backend",
      "sortOrder": number
    }
  ]
}

Ticket structure (follow this exactly):
- Ticket 1 (sortOrder: 1, backend): Database models and auth setup
- Ticket 2 (sortOrder: 2, backend): API routes and business logic
- Ticket 3 (sortOrder: 3, frontend): Auth UI (login/register pages)
- Ticket 4 (sortOrder: 4, frontend): Dashboard or analytics view — leave ONE product ambiguity unresolved in the description. For example: "The PRD mentions statistics but doesn't specify the time range for the dashboard metrics."
- Ticket 5 (sortOrder: 5, frontend): Main CRUD interface
- Ticket 6 (sortOrder: 6, backend): Integration, error handling, and final wiring

Rules:
- Exactly 6 tickets. No more, no fewer.
- assignedRole is exactly "frontend" or "backend" — no other values.
- sortOrder is 1 through 6, sequential.
- Descriptions reference specific technical artifacts (table names, route paths, component names).
- Ticket 4 MUST contain an unresolved product question — this is intentional.`;

router.post('/generate', async (req, res) => {
  const startTime = Date.now();
  try {
    const { prd } = req.body as { prd: string };

    if (!prd || typeof prd !== 'string') {
      logger.warn('PLANNER', 'Invalid PRD received', { hasPrd: !!prd, type: typeof prd });
      res.status(400).json({ error: 'prd (string) is required in the request body' });
      return;
    }

    logger.info('PLANNER', '🤖 Calling Claude API to generate tickets', { prdLength: prd.length });
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      temperature: 0,
      system: PLANNER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Here is the PRD:\n\n${prd}` }],
    });
    const apiTime = Date.now() - startTime;
    logger.info('PLANNER', `✅ Claude API responded in ${apiTime}ms`);
    
    const textBlock = message.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
        logger.error('PLANNER', 'No text content in Claude response', { contentBlocks: message.content.length });
        res.status(500).json({ error: 'No text content in Claude response' });``
        return;
    }
    
    let jsonText = textBlock.text.trim();
    logger.debug('PLANNER', 'Parsing Claude response', { responseLength: jsonText.length });

    if (jsonText.startsWith('```')) {
      logger.debug('PLANNER', 'Stripping markdown code fences from response');
      jsonText = jsonText
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/, '');
    }

    const parsed = JSON.parse(jsonText) as {
      tickets: { title: string; description: string; assignedRole: string; sortOrder: number }[];
    };
    logger.info('PLANNER', `📋 Parsed ${parsed.tickets.length} tickets from Claude response`);

    const created = parsed.tickets.map((t) => {
      logger.debug('PLANNER', `Creating ticket #${t.sortOrder}: ${t.title}`, { role: t.assignedRole });
      return createTicket({
        title: t.title,
        description: t.description,
        assignedRole: t.assignedRole,
        sortOrder: t.sortOrder,
      });
    });

    const totalTime = Date.now() - startTime;
    logger.info('PLANNER', `✅ Generated ${created.length} tickets in ${totalTime}ms`);
    res.json({ tickets: created });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && (err as NodeJS.ErrnoException).cause;
    logger.error('PLANNER', 'Failed to generate tickets', { error: message, cause: cause ? String(cause) : undefined, stack: err instanceof Error ? err.stack : undefined });
    res.status(500).json({ error: message, cause: cause ? String(cause) : undefined });
  }
});

export default router;
