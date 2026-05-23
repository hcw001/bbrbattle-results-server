---
name: create-task
description: Append a structured task to the backlog in PLAN.md.
---

Use this after exploratory work when you identify something that needs to be done — a gap, a bug, a missing feature, a refactor — that isn't being addressed right now.

## Task format

Each task is a single line appended to the `## Tasks` section of `PLAN.md`:

```markdown
- [ ] **Title** — what to do and why it matters. Found: <origin>. Requires: *Title*. (omit if no dependency)
```

### Required fields

- **Title:** short noun phrase (3–6 words), specific enough to act on.
- **Description:** one sentence on what to do and why it matters.
- **Found:** where and how the gap was discovered. This field is mandatory — it is the primary context a future session will use to pick up the task cold. Be specific:
  - File + line if applicable: `` `src/rules/submarines.ts:88` ``
  - Section of a reference doc: `` `docs/combat/reference.md §4.2` ``
  - What triggered the observation: "during review of destroyer detection logic", "noticed while writing scenario test for tac bomber Target Select", "reading combined arms table"
  - The concrete symptom or gap: "the detection cap is implemented but never tested", "event is emitted but the field is typed as `any`"

### Optional fields

- **Requires:** name the specific task title(s) that must be completed first. Omit the field entirely if there are no dependencies.

## How to append

Find the `## Tasks` section in `PLAN.md` and add the new line after the last existing entry. Do not reorder, edit, or remove any existing entries.

## Examples

```markdown
- [ ] **Destroyer detection cap tests** — add scenario tests covering the 3-subs-per-destroyer cap introduced by Super Submarines tech; the logic exists in `src/rules/submarines.ts` but has zero test coverage. Found: `src/rules/submarines.ts:31` during review of sub special-ability cancellation — `effectiveSubsCancelled` is untested end-to-end.

- [ ] **Capital ship timing carve-out audit** — verify the timing carve-out (undamaged capital ship hit in steps 3–4 fires at full values that round) is correctly enforced in step2Special and step3Attackers. Found: `docs/combat/reference.md §1.1` while cross-referencing the damage state logic in `src/rules/capitalShip.ts:55` — the rule is documented but no scenario test exercises the within-round timing edge case. Requires: *Destroyer detection cap tests*.
```
