---
name: clinic-i18n
description: Translation and internationalization workflow for the clinic patient-flow app (English/French, German as a third rollout language). Use this skill whenever adding, editing, or reviewing any user-facing string in the app — UI labels, buttons, status names, form fields, validation/error messages, toasts, or tooltips — in any language. Also use it when a new screen, component, or workflow status is introduced, since new source strings must be translated and glossary-checked before merge, and when auditing existing translations for consistency. Trigger even if the user only asks for the English string and doesn't mention translation — this app is multi-language by default, so every new string implies a translation obligation.
---

# Clinic i18n Skill

This app is used exclusively by clinical staff (frontdesk, nurses, doctors, lab techs,
medical physicists, IT admin) to manage patient flow. There are no patient-facing
screens. That context drives every rule below: precision and consistency beat warmth,
and a wrong translation of a workflow status is a patient-safety-adjacent bug, not a
cosmetic one — a mistranslated "lab result pending" vs "lab result ready" is exactly
the kind of thing that causes real harm.

Languages: **English (source, British/international spelling)** → **French (primary
target)** → **German (secondary, lower-confidence, rolling out later)**.

## Before translating anything

1. Read `glossary.md`. Every clinical, workflow, or status term used more
   than once **must** go through the glossary. Never translate the same source term
   two different ways in two different places — that's the single most common source
   of staff confusion in multilingual clinical software.
2. If the term isn't in the glossary yet, this is a **new term event**: propose a
   translation, add it to the glossary with a one-line rationale, and flag it for
   human review (see "Flagging for review" below) rather than silently deciding alone.
3. Read `style-guide.md` for register, tone, and phrasing rules per
   language. Do not improvise formality — it's specified there and should not vary
   screen to screen.

## Core translation rules

- **Register:** Formal throughout. French uses *vous*, never *tu*. German uses *Sie*,
  never *du*. This applies uniformly across all staff roles and screens — do not warm
  it up for frontdesk vs. clinical staff; consistency matters more than a "friendlier"
  frontdesk tone in a tool multiple roles share and read side by side.
- **Vocabulary register for Francophone/Anglophone Africa:** Prefer terms broadly
  understood across West and East African French/English rather than France-specific
  or UK-specific idioms and slang. When in doubt, choose the more international/plain
  option over the more regionally colorful one. Don't assume familiarity with
  France-only bureaucratic phrasing or British-only idiom.
- **No literal calques:** Translate meaning and clinical intent, not word-for-word
  structure. A phrase that's grammatically correct but reads as translated (a
  "calque") is a defect — reword until it reads as if originally written by a
  clinician in that language.
- **Gender neutrality:** Staff roles and patient references should default to
  gender-neutral phrasing where the target language allows it (e.g. avoid gendering
  "the patient" or "the technician" unless the source explicitly does). Where French
  or German forces a grammatical gender choice, prefer the standard neutral or
  epicene form used in professional/clinical writing, not the masculine-as-default
  convention, unless the glossary specifies otherwise for a given term.
- **Terseness for UI:** Clinical staff scan these screens fast, and French/German
  strings often run 20–35% longer than English. Prioritize a short, precise
  translation that fits UI space over a longer, more "complete" one. If a literal
  translation would overflow a button or badge, prefer an abbreviation pattern
  already used elsewhere in the glossary over inventing a new one.
- **No string concatenation:** Never build sentences by gluing translated fragments
  together in code (`t('patient') + ' ' + t('waiting')`). Word order, gender
  agreement, and pluralization differ across languages — always translate the full
  sentence/phrase as one message key. This is a technical rule, not a style
  preference, and applies regardless of which i18n library the app uses.
- **Placeholders, not hardcoded values:** Use named placeholders (e.g. `{patientName}`,
  `{count}`) inside message strings rather than splitting a sentence around a
  variable. This keeps grammar intact across languages when the value changes.
- **Pluralization:** Use the target library's plural-category support (CLDR plural
  rules) rather than manual `if (count === 1)` logic in translated strings — French
  and German pluralize differently from English (French treats 0 as singular for
  many nouns; German has its own boundary at 1). Never hardcode an "(s)" suffix
  pattern in a translation.
- **Formatting stays neutral, not locale-specific:** Per project decision, dates,
  numbers, and currency use **one neutral format across all languages** (not
  locale-switched) for cross-clinic consistency. Default to ISO 8601 for dates
  (`2026-09-14`) and explicit units, regardless of UI language. Do not introduce
  locale-specific date/number formatting unless this decision is explicitly revisited.

  > **⚠️ SUPERSEDED for dates (2026-09-15).** This rule was explicitly revisited
  > and **overridden**. The project now uses **locale-aware date formatting**
  > (`fr-FR` / `en-US` via `toLocaleDateString` / `toLocaleString`), because a
  > French-speaking clinician expects `14/09/2026` rather than ISO `2026-09-14`.
  >
  > **Do not re-introduce the neutral-ISO rule for dates.** Number and currency
  > formatting remain neutral unless separately revisited.
- **Context comments:** When adding a translation key, include a short translator
  context comment in the source file (screen name, and what the string means if it's
  ambiguous out of context — e.g. "Pending" as a lab-result status vs. an
  appointment status must be two different keys with two different context notes,
  never the same key reused). This is what lets a future human reviewer or a
  different translation pass get it right without guessing.

## Library-agnostic technical conventions

The app should stay portable across i18n libraries (i18next, next-intl, react-intl,
etc.). Regardless of which one is in use:

- Structure keys hierarchically by feature/screen, not by raw English string, e.g.
  `patientFlow.status.labPending`, not `"Lab result pending"` used as the key itself.
  Raw-string keys break the moment the English source text needs a small copy edit.
- Keep translation files as flat-per-locale JSON/YAML (`en.json`, `fr.json`,
  `de.json`) with matching key structure across all three — a missing key in one
  locale should be easy to detect by diffing key sets.
- Author messages in ICU MessageFormat syntax where the library supports it
  (`{count, plural, one {...} other {...}}`), since it's the closest thing to a
  portable standard across libraries and translators.
- Never embed markup/HTML inside a translation string if it can be avoided — pass
  rich text as components/slots so translators only ever touch plain sentences.

## Self-QA before accepting any translation

No professional reviewer is confirmed yet, so the agent is the first line of
defense. Before considering a translation done, run this checklist (see
`qa-checklist.md` for the full version):

1. **Back-translate mentally** — translate the FR/DE string back to English in your
   head. Does it mean the same clinical thing as the source, with no drift?
2. **Glossary check** — does every clinical/workflow term match the glossary exactly?
3. **Register check** — vous/Sie maintained, no stray informal forms?
4. **Fit check** — plausible length for a UI label/button/badge?
5. **Ambiguity check** — would this string be misread differently in a different
   screen context? If yes, it needs its own key, not reuse.

If a string fails any check and can't be confidently resolved, don't guess — flag it.

## Flagging for review

Since translations are AI-assisted without a locked-in professional reviewer, treat
your own output as provisional until reviewed, especially for German. When a string
is uncertain (a new clinical term, an idiom, anything safety-relevant like a status
or alert), mark it in a dedicated review queue rather than merging it silently:

- Append an entry to `i18n-review-queue.md` in the project root (create it if it
  doesn't exist) with: the key, source English, proposed translation(s), and a
  one-line reason it's flagged.
- Locale files are **strict JSON**, so the `// i18n-review: <reason>` inline
  comment convention cannot be used. The review-queue entry is the sole record;
  do not attempt to add comments to `en.json` / `fr.json`.
- German gets flagged more readily than French by default — it's the lower-priority,
  lower-confidence language until its purpose and audience are clarified. When in
  doubt on a German string, flag it rather than ship a confident-sounding guess.

## Adding a new language later

Follow the same pattern: a `style-guide.md` entry for register/tone, and
every term passing through the shared glossary before use. Don't let a new language
skip the glossary step even under time pressure — that's how terminology drift starts.

## Enforcement

Run `pnpm --filter patient-flow-client run i18n:check` to verify every locale file
defines exactly the same key set. The script discovers locale files automatically,
so adding a new language requires no changes to it. It exits non-zero on drift and
should be run before merging any change that touches user-facing strings.
