---
name: update-changelog
description: Mark the completed task in PLAN.md and append a dated entry to CHANGELOG.md.
---

Run this after completing any non-trivial work (bug fix, new feature, significant refactor). Skip for exploratory work, pure read-only investigation, or single-line fixes.

Perform up to two operations:

## 1. Mark task complete in PLAN.md (conditional)

If the work corresponds to a `- [ ]` item in the `## Tasks` section of `PLAN.md`, change it to `- [x]`. Edit only that line. If no matching unchecked task exists, skip this step entirely.

## 2. Append an entry to CHANGELOG.md (always)

Append a new entry under the existing entries in `CHANGELOG.md`.

### Format

```markdown
### YYYY-MM-DD — <one-line summary of the work>

- <bullet 1>
- <bullet 2>
...
```

### Rules

- Use today's date (`currentDate` in context, or ask if unknown).
- Summary line: noun phrase, not a sentence (e.g., "Sub target select + combined arms fixes", not "Fixed sub target select").
- Bullets: sentence case, end with a period, 2–5 total.
- Cover what changed, any non-obvious decisions, and test/type-check status if relevant.
- Do not repeat content already in a prior entry.
- Append only — never edit existing entries.
