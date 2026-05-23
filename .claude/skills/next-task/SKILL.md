---
name: next-task
description: Pick the next task from PLAN.md, complete it, then run /update-changelog.
---

## Step 1 — Pick the next task

Read `PLAN.md`. Scan `## Tasks` for all `- [ ]` entries and select one using these checks in order:

1. **Unblocked first** — skip any task whose `Requires:` dependency is still `- [ ]`.
2. **Foundational first** — prefer tasks that unblock other pending tasks.
3. **Scope fit** — prefer tasks whose `Found:` context points to the same area as other pending work (grouping related tasks reduces context switching).
4. **Order as tiebreaker** — when otherwise equal, earlier in the list wins.

State clearly which task you selected and why.

## Step 2 — Load context

Read the `Found:` field of the selected task. Open the referenced file(s) and section(s) before writing any code. The `Found:` field exists precisely so you can reconstruct full context without relying on session memory — treat it as your starting point, not a hint.

## Step 3 — Complete the task

Do the work. Run type-check and tests when done:

```bash
npx tsc --noEmit
npx vitest run
```

Fix any failures before proceeding.

## Step 4 — Close out

Run `/update-changelog`, which will mark the task `[x]` in `PLAN.md` and append an entry to `CHANGELOG.md`.
