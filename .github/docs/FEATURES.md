# Feature Spec

## Create Task Modal

| Field | Required | Details |
|---|---|---|
| Title | yes | Short name for the card |
| Prompt | yes | Instruction sent to Claude Code |
| Token budget | yes | No default. Presets: 10K, 50K, 100K, 200K. Custom input allowed |
| Permission mode | yes | Default: `bypassPermissions`. Dropdown to switch to `acceptEdits` |
| Tags | no | Presets: feature, refactor, bugfix, setup, test, docs. User can create custom |
| Notes | no | Extra context |

Tasks in `todo` can be edited. Once started, no editing.

## Kanban Card — by state

**Todo:** title, tags, budget, Start button, Edit button, Delete button

**Running:** title, tags, elapsed time, live step feed (all steps, scrollable, verbose — assistant messages, tool_use, tool_result, thinking), token bar (current / budget), live cost in $, message input (pipes to stdin), Stop button (confirmation required)

**Done:** title, tags, summary (total tokens, cost, steps, duration), Delete button. PR auto-attempted via `gh pr create` on completion — silent skip if `gh` unavailable.

**Token Exceeded:** title, tags, summary at time of kill, slider to set new budget, Resume button, Delete button

**Failed:** title, tags, error info, Retry button, Delete button

Delete always requires confirmation. Delete cleans up worktree + branch from disk.

## Token Budget Enforcement

On every token usage event from the stream: sum cumulative tokens for the task → compare against task budget → if exceeded, kill process immediately, save session ID, move to `token_exceeded`.

Resume: user sets new budget with slider → spawn `claude --resume <session_id>` → token tracking continues from prior total.

## Workspace Budget

Session-wide dollar cap set by the user. Live progress bar in the top bar. When total cost across all tasks hits the cap: kill ALL running processes at once, save all session IDs, move all to `token_exceeded`.

## Session Stats (top bar)

- Task counts: todo, running, done, token_exceeded, failed
- Total tokens across all tasks
- Total cost across all tasks
- Workspace budget bar (spent / cap)

## Detail View

Opens on card click (drawer from right).

Contents:
- Summary: total tokens, cost, duration, step count
- Full step history in chronological order — each step shows: type, content, tokens, cost, timestamp
- Bar chart: tokens per step
- Most expensive step highlighted
- Input vs output tokens separated
- For running tasks: live updating

## Workspace Timeline

Cross-task activity feed showing timestamped events: task started, task completed, task exceeded budget, task failed, task resumed. Built from existing event data.

## Historical Analytics

Persisted across sessions (never purge completed task data). Shows:
- Total tasks all-time
- Total cost all-time
- Average cost per task
- Average duration per task
- Most common tag

## Worktree Lifecycle

1. User clicks Start → `git worktree add .worktrees/<task-slug> -b orchestrator/<task-slug>`
2. Claude Code spawns with `--cwd` pointing to the worktree
3. Task completes → worktree stays, `gh pr create` attempted
4. User deletes task → `git worktree remove` + `git branch -D`

## API Endpoints

| Method | Route | Purpose |
|---|---|---|
| POST | `/tasks` | Create task |
| GET | `/tasks` | List all tasks |
| GET | `/tasks/:id` | Task detail + events |
| PUT | `/tasks/:id` | Edit task (todo only) |
| POST | `/tasks/:id/start` | Start task → spawn agent |
| POST | `/tasks/:id/stop` | Kill process → failed |
| POST | `/tasks/:id/resume` | Resume from exceeded/failed |
| POST | `/tasks/:id/retry` | Retry failed task |
| DELETE | `/tasks/:id` | Delete task + cleanup worktree |
| GET | `/workspace/stats` | Session stats |
| PUT | `/workspace/budget` | Set workspace budget |
| GET | `/workspace/timeline` | Cross-task event feed |
| GET | `/analytics` | Historical stats |
