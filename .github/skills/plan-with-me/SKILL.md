---
name: plan-with-me
description: >
  ALWAYS invoke when the user describes a new feature, page, or
  significant change (multi-part work, new flows, new surfaces,
  decisions with downstream consequences). Do NOT invoke for
  trivial changes: one-line fixes, copy tweaks, or tasks where
  the user has already specified exactly what to do. Do not
  produce a plan for non-trivial work without this skill first.
  Triggers on "build", "create", "add", "implement", or any
  description of a non-trivial task.
---

## Steps

1. **Map the decision space before asking anything.**
   Before interviewing, sketch out the branches of the task
   yourself: what are the axes of ambiguity (scope, behavior,
   edge cases, integration points, constraints)? A question set
   that only covers the first thing you thought of is not enough —
   deliberately look for the decisions that are easy to miss:
   error/edge-case handling, what happens to existing behavior,
   naming/structure conventions, and anything the user's request
   implies but doesn't state.

2. **Answer what you can yourself first.**
   Resolve anything discoverable through context, precedent, or
   exploration (existing code, prior messages, stated conventions)
   without asking. Only bring genuinely open decisions to the user.

3. **Interview thoroughly, not just broadly.**
   For each branch of the decision tree, follow it down to where
   it actually resolves — don't stop at the first answer if it
   opens new sub-questions. A "yes" or a chosen option should
   prompt you to check what that choice implies before moving on.
   - Batch related questions together rather than one at a time,
     unless a later question genuinely depends on an earlier answer.
   - For each question, give your own recommended answer.
   - Treat silence or a quick answer from the user as a cue to
     confirm your interpretation back, not to assume full alignment.
   - Before calling it done, do a second pass: reread the original
     request and check whether any part of it hasn't been
     addressed by a question yet.
   - Stop only when you can't find another decision that would
     change what gets built or how — not when the user seems tired
     of answering.

4. **Produce the plan:**
   - Summary of what we agreed on (including defaults you chose)
   - Task breakdown with dependencies/blocking relationships
   - Open questions we deliberately deferred, and why they're safe
     to defer

5. **Wait for approval before writing any code.**
   - Full approval → proceed.
   - Partial approval/pushback → revise only the disputed part and
     re-confirm just that, don't re-litigate the whole plan.

6. **If reality diverges from the plan mid-build**, stop and
   surface it to the user rather than silently improvising.