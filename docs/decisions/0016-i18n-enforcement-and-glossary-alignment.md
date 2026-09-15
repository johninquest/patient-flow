# i18n Enforcement: Locale-Aware Dates, Glossary Alignment, and Parity Checking

**Date:** 2026-09-15  
**Status:** decided

## Problem

An audit of every `t()` call in the client revealed substantial translation debt
that was invisible because of how the code was written:

1. **Two entire namespaces were missing** from both locale files — `audit.*`
   (used by `AuditTimeline.tsx`) and `roles.*`. The Activity timeline rendered
   English for French users.
2. **~30 keys were referenced but never defined**, across `common`, `encounters`,
   `tasks`, `patients`, and `staff`.
3. **The pervasive `t('key', 'English fallback')` pattern hid all of it.** A
   missing key silently rendered the inline English string, so drift never
   surfaced as an error and translators never saw the string.
4. **Two sites built sentences by concatenation** — `` `Active ${t('encounters.title')}` ``
   in `Dashboard.tsx` and `t('patients.firstName') + ' is required'` in
   `PatientForm.tsx`. These are untranslatable: French word order and gender
   agreement differ.
5. **Role labels contradicted the glossary.** `provider` was "Prestataire"
   (reads as *contractor* in French) where the glossary specifies Doctor =
   **Médecin**; `clinical_staff` was "Personnel clinique" vs Nurse =
   **Personnel infirmier**.
6. **Two namespaces existed for one concept** — `AuditTimeline.tsx` used
   top-level `roles.*` while `Staff.tsx` used `staff.roles.*`.

Separately, the `clinic-i18n` skill mandated **neutral ISO 8601 dates regardless
of UI language**, which the codebase violated in ten places — most explicitly in
`Profile.tsx`, which switched between `fr-FR` and `en-US`.

## Decision

**Remove all inline English fallbacks.** `t()` calls take a key only. The
`fallbackLng: 'en'` setting in `i18n/index.ts` is retained as a runtime safety
net, but the parity script is the real gate.

**Add `pnpm run i18n:check`** (`apps/client/scripts/i18n-check.mjs`) — a
standalone script that discovers every locale file, flattens each key tree, and
fails with a non-zero exit code if any locale's key set differs from the
reference. It is N-locale by design, so adding `de.json` later requires no
changes to the script.

**Consolidate on `staff.roles.*`** as the single role namespace; `roles.*` is not
created.

**Realign role labels to the glossary:** `provider` → **Médecin**,
`clinical_staff` → **Personnel infirmier**, `front_desk` → Accueil,
`admin` → Administrateur.

**Override the skill's date rule: keep locale-aware dates.** Dates use
`toLocaleDateString` / `toLocaleString` with `fr-FR` / `en-US`. The skill's
`SKILL.md` and `style-guide.md` were updated to record this override so it is not
re-litigated.

**Clarify the French register rule:** use **standard metropolitan French
vocabulary** while **avoiding France-only administrative jargon** — reconciling
the product intent ("lean towards France terminology") with the skill's
international-readability goal.

**Defer German.** The skill lists it as a third language; it is not scaffolded.
The parity script will enforce it automatically when added.

**Record translator notes in `i18n-review-queue.md`** rather than inline
`// i18n-review:` comments, which strict JSON cannot hold.

## Rationale

**Why remove inline fallbacks if `fallbackLng` already covers missing keys?**
They are different mechanisms. `fallbackLng` is a runtime safety net; the inline
fallback is a *second copy of the English string living in code*, invisible to
translators and to any key audit. Removing it makes the source of truth the locale
file alone. Keeping `fallbackLng` means a missed key degrades to English rather
than showing a raw key in front of a customer — the right trade-off for a demo,
with the script providing the strictness.

**Why a standalone script rather than a unit test?** The client has no test
runner configured (`"test": "echo \"no client tests yet\" && exit 0"`). Adding
Vitest purely to check key parity would be disproportionate. A dependency-free
Node script runs anywhere, is trivially readable, and can be wired into CI later.

**Why override the skill on dates?** The skill's neutral-ISO rule exists for
cross-clinic consistency, and it explicitly permits revisiting. For a
French-speaking clinician, `14/09/2026` is the expected form and ISO `2026-09-14`
reads as technical. The skill is a guide, not a constraint — but the override is
recorded in the skill itself so future sessions do not silently revert it.

**Why align role labels to the glossary rather than extend the glossary?** The
glossary is the stated single source of truth for recurring clinical terms, and
"Médecin" is unambiguously correct for a doctor-facing role. "Prestataire" was
actively misleading. Extending the glossary to accommodate a wrong translation
would invert the intended relationship.

**Consequences accepted:** the parity script checks *key presence*, not
translation quality — a key present but poorly translated passes. Quality is
covered by the skill's self-QA checklist and the review queue, which requires
human review that is not yet assigned. The review queue is therefore an open
obligation, not a closed one.
