Orchestrator — v1 Lock-In, Ranking & Positioning


Compiled after a full feature pass and a fresh competitive check (June 2026). This supersedes earlier framing that assumed nobody else tracks tokens — that's no longer accurate, and the positioning below reflects the real gap.




What's Locked for v1

Task Management


5 Kanban columns: Todo → Running → Done → Token Exceeded → Failed
Create task: Title (required), Prompt (required), Token budget (required, presets + custom, no default), Permission mode (default bypassPermissions, dropdown to switch to acceptEdits)
Edit while in Todo: title, prompt, budget, permission mode


Agent Launching


Git required — refuses to start without it
Worktree + branch per task, no auto-merge, worktree persists until task is deleted
claude -p with bidirectional stream-json (input + output), session ID captured on init
gh pr create attempted silently on completion, skipped if unavailable


Live Monitoring


All steps visible on the card, scrollable, verbose (assistant messages, tool_use, tool results, thinking)
Mid-task messaging — text input on Running cards, piped via stdin


Token Optimization (the core)


Per-task budget: live usage bar, live $ cost (from public pricing), auto-kill at limit → Token Exceeded
Resume from Token Exceeded: slider to set new budget, resumes via --resume <session_id>
Workspace budget (new): session-wide $ cap, live progress bar, hard stop — pauses ALL running agents the moment it's hit


Controls


Start, Stop (confirm), Resume, Message, Edit (Todo only), Delete (confirm), Retry (Failed)


Analytics


Card summary: total tokens, cost, steps, duration
Detail view: full step history, bar chart of tokens/step, most expensive step, input/output split
Workspace timeline (new): cross-task activity feed
Historical analytics (new): all-time stats — most common task type, average cost, average duration


Deferred to v2 (flag if you want any of these back in v1)


Tags + search/filter
Notes field
Templates
Attention Center (permission-required / give-up-after-failure flags)



Ranked — What Matters Most


Hard per-task budget enforcement (auto-kill) — the one thing nobody else in this space does. Everything else builds on this.
Workspace budget with hard stop — takes #1 from "per-task guardrail" to "account-level spend control." The boldest single claim you can make.
Live token bar + live cost per card — makes enforcement visible before it happens, not just after.
Token Exceeded as a resumable state — a hard stop that doesn't feel like a crash. Slider + session resume turns enforcement into a decision point.
Post-task analytics, per-step breakdown — turns raw spend into learnable intuition about what tasks should cost.
Historical analytics across sessions — the feature that makes the tool more valuable the longer it's used.
Worktree isolation per task — necessary for safe parallelism. Shared with Conductor and Kanban Code — not differentiating, but the product breaks without it.
Workspace timeline — cheap to build (data already exists), reinforces the "mission control" feel.
Kanban board itself — the delivery shell. Expected category convention, not a selling point on its own.
Live step feed — table stakes. Vibeyard and Kanban Code both do this with richer terminal rendering.
Mid-task messaging — useful, but a constrained version of what full-terminal tools give natively.
Open source + npm distribution — real, but not unique. Vibe Kanban (BloopAI) is open source too.
Basic controls — plumbing.



Competitive Landscape (verified June 2026)

ToolLicensePlatformsWorktreesToken/cost trackingHard enforcementNotesOrchestratorMIT, open sourcenpm, cross-platformYes, per taskYes, live per-card + workspaceYes — auto-kill at limitHeadless stream-json only, no embedded terminalVibeyardClosed sourcemacOS/Linux/Windows, npm installUnclear from public docsYes — real-time spend, tokens, context windowAlerts only, not confirmed to auto-stopFull terminal UI, 4 agent CLIs, swarm mode, session sharingVibe Kanban (BloopAI)Open sourceCross-platform, self-hostableYes, via "workspaces"Not advertisedNoStrong on diff review + dev server preview, 10+ agent supportKanban CodeOpen sourceNative macOS + Windows onlyYes, auto-createdNot advertisedNoDeep session/PR/tmux integration, push notifications for attentionConductorUnverified this sessionMac only (per earlier research)Yes, pioneered this patternUnverified — re-check before quotingUnverifiedDon't cite cost claims about this one without re-checking

The honest gap: Visibility into tokens and cost is now table stakes — three competitors already do it well. What nobody does is stop the agent automatically. That's the wedge. It's narrower than originally pitched, but it's real and it's verifiable.


Positioning Statement

Orchestrator is the open-source Kanban board for Claude Code that doesn't just show you what an agent is spending — it stops the agent the moment it spends too much.

Supporting context worth using in a pitch:


Headless/programmatic Claude usage moved to a separate, hard-capped, metered credit pool as of June 15, 2026 — no rollover, automation halts at zero. The exact mode this tool runs on now has a real, finite budget with no safety net.
Reported cost incidents are no longer hypothetical — organizations have cut Claude Code entirely over runaway spend in 2026.
Every visible competitor monitors and alerts. None claims to auto-terminate. Orchestrator's auto-kill plus workspace-wide hard stop is the one mechanic that's actually new in this category.


One sentence for a pitch deck or README opener:
"Other tools tell you an agent went over budget. Orchestrator stops it before it does."