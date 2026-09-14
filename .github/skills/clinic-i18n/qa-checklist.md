# Translation Self-QA Checklist

Run this for every new or edited FR/DE string before considering it done. This is
the agent's own quality gate in the absence of a confirmed professional reviewer —
treat it as mandatory, not optional.

## 1. Back-translation check
Mentally translate the FR/DE string back into English.
- Does it convey the exact same clinical/workflow meaning as the source?
- Any drift in urgency, certainty, or scope? (e.g. "pending" vs "delayed" vs
  "unavailable" are not interchangeable for a lab status.)

## 2. Glossary conformance
- Does every recurring term match `glossary.md` exactly?
- If this is a new term: was it added to the glossary in the same change, with a
  rationale note?

## 3. Register conformance
- French: vous form only, no tu, no informal contractions.
- German: Sie form only, no du.
- Consistent with the tone described in `style-guide.md` — no stray friendliness
  or exclamation marks.

## 4. Fit and legibility
- Would this plausibly fit a button, badge, or label in the UI it's used in?
- If it's noticeably longer than the English source, is there a shorter correct
  alternative? Check the glossary for an existing abbreviation pattern first.

## 5. Ambiguity / context check
- Could this exact string be misread differently if reused on a different screen?
  (e.g. "Pending" for both lab and appointment status — these must be different
  keys with different context comments, never shared.)
- Does the key have a context comment explaining where/how it's used, for the
  benefit of a future reviewer?

## 6. Technical hygiene
- No string concatenation used to build this message.
- Any variable in the string uses a named placeholder, not a raw interpolation
  that would break word order/gender agreement.
- Pluralization (if relevant) uses CLDR plural categories, not manual English-style
  `(s)` suffixing.

## If anything fails
Don't silently pick your best guess. Log it:
- Add a row/entry to `i18n-review-queue.md` (key, source, proposed translation,
  reason flagged).
- Add `// i18n-review: <reason>` next to the key in the locale file.
- For German specifically, default to flagging unless you're highly confident —
  it's the lower-priority, lower-review-coverage language for now.
