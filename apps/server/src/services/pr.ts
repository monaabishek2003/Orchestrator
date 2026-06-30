import { execFileSync } from "node:child_process";

import type { Task } from "@prisma/client";

import { getRepoRoot } from "../git.js";

/** Check whether the `gh` CLI is available in PATH. */
function isGhAvailable(): boolean {
  try {
    execFileSync("gh", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Best-effort: push the task's branch and open a GitHub PR via `gh pr create`.
 * Fully silent and non-throwing — any failure (no gh, not authenticated, no
 * remote, branch not pushed, etc.) is logged at debug level and swallowed.
 * Never blocks task completion, never changes task status.
 */
export async function attemptPullRequest(task: Task): Promise<void> {
  try {
    if (!task.branchName || !task.worktreePath) {
      console.debug(
        `PR skip: task ${task.id} has no branch/worktree, skipping PR creation`,
      );
      return;
    }

    if (!isGhAvailable()) {
      console.debug("gh CLI not found, skipping PR creation");
      return;
    }

    const repoRoot = getRepoRoot();

    // Push the branch from the worktree context. Bail silently on failure.
    try {
      execFileSync("git", ["push", "origin", task.branchName], {
        cwd: task.worktreePath,
        stdio: "ignore",
      });
    } catch (err) {
      console.debug(
        `PR skip: failed to push ${task.branchName}: ${String(err)}`,
      );
      return;
    }

    // Create the PR from the main repo context so gh resolves the remote.
    try {
      const output = execFileSync(
        "gh",
        [
          "pr",
          "create",
          "--title",
          task.title,
          "--body",
          "Created by Orchestrator",
          "--head",
          task.branchName,
          "--fill",
        ],
        { cwd: repoRoot, encoding: "utf8" },
      );
      console.log(`PR created for task ${task.id}: ${output.trim()}`);
    } catch (err) {
      console.debug(`PR creation failed for task ${task.id}: ${String(err)}`);
    }
  } catch (err) {
    // Defensive: never let PR automation throw.
    console.debug(`PR attempt error for task ${task.id}: ${String(err)}`);
  }
}
