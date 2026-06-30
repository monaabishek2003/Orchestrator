import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

/** Resolved absolute path to the git repository root. Set by {@link gitPreflight}. */
let repoRoot: string | null = null;

/** Run a git command from the repo root and return trimmed stdout. */
function git(args: string[], cwd: string): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" }).trim();
}

/** Run a git command, swallowing any error (for idempotent cleanup). */
function gitQuiet(args: string[], cwd: string): void {
  try {
    execFileSync("git", args, { cwd, stdio: "ignore" });
  } catch {
    // Intentionally ignored — cleanup must be idempotent.
  }
}

/** Absolute path to the git repository root. Throws if preflight hasn't run. */
export function getRepoRoot(): string {
  if (repoRoot === null) {
    throw new Error("Git preflight has not run — repo root is unknown.");
  }
  return repoRoot;
}

/**
 * Validate that git is available and the process is running inside a git
 * repository. On failure, print a clear message and exit with code 1.
 * On success, store the repository root for the worktree service.
 */
export function gitPreflight(): void {
  try {
    execFileSync("git", ["--version"], { stdio: "ignore" });
  } catch {
    console.error(
      "Orchestrator requires git, but it was not found in your PATH.\n" +
        "Install git and try again.",
    );
    process.exit(1);
  }

  try {
    execFileSync("git", ["rev-parse", "--git-dir"], { stdio: "ignore" });
  } catch {
    console.error(
      "Orchestrator must be run from within a git repository.\n" +
        "Change into a git repo (or run `git init`) and try again.",
    );
    process.exit(1);
  }

  repoRoot = git(["rev-parse", "--show-toplevel"], process.cwd());
}

/**
 * Convert a task title into a filesystem/git-safe slug with a short unique
 * suffix to avoid collisions between similar titles.
 */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50)
    .replace(/-+$/g, "");

  const suffix = randomUUID().replace(/-/g, "").slice(0, 6);
  return base ? `${base}-${suffix}` : suffix;
}

/**
 * Create a git worktree and branch for a task.
 * Path: `<repo-root>/.worktrees/<taskSlug>`, branch: `orchestrator/<taskSlug>`.
 * Throws if the worktree or branch already exists. Returns the absolute path.
 */
export function createWorktree(taskSlug: string): string {
  const root = getRepoRoot();
  const relPath = join(".worktrees", taskSlug);
  const branch = `orchestrator/${taskSlug}`;

  git(["worktree", "add", relPath, "-b", branch], root);

  return join(root, relPath);
}

/**
 * Remove a task's worktree and delete its branch. Idempotent — does not throw
 * if the worktree or branch is already gone.
 */
export function removeWorktree(taskSlug: string): void {
  const root = getRepoRoot();
  const relPath = join(".worktrees", taskSlug);
  const branch = `orchestrator/${taskSlug}`;

  gitQuiet(["worktree", "remove", relPath, "--force"], root);
  gitQuiet(["branch", "-D", branch], root);
}
