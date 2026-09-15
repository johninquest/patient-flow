# Style Guide

## Global

- Audience: clinical staff only, never patients. Precision and speed-of-scanning
  beat friendliness. Avoid exclamation points, avoid "friendly" filler ("Great, all
  done!"). State the fact or instruction plainly.
- Source language: British/international English spelling (colour, organise,
  centre). Avoid UK-only idiom or slang that wouldn't be familiar to an
  international/African English-speaking reader — plain, international English.
- Avoid humor, idioms, or culturally specific references anywhere in the app —
  they translate badly and clinical tools should read as neutral and professional
  in every language.

## French

- Register: **vous**, always. Never tu, in any string, in any context.
- Prefer vocabulary broadly understood across West/East African Francophone
  contexts over France-specific bureaucratic or informal register. If a term has
  both a "Metropolitan France" administrative phrasing and a more neutral
  international-French phrasing, prefer the neutral one.

  > **Clarified (2026-09-15).** The project's working rule is: use **standard
  > metropolitan French vocabulary** (so the UI reads as natural, correct French
  > to any Francophone reader), while **avoiding France-only administrative
  > jargon** that would confuse readers outside France. This reconciles the
  > "prefer France terminology" product intent with the international-readability
  > goal above — it is not a licence to use regionally colourful idiom.
- Gender: use gender-neutral or epicene forms by default for roles and generic
  references to "the patient" / "the staff member," unless a glossary entry
  specifies otherwise. Where French forces agreement (e.g. "prêt/prête"), use the
  slash form (`prêt(e)`) in compact UI contexts; spell out both forms in longer-form
  text if that's ever needed.
- Keep sentences short — French UI strings tend to run longer than English source;
  don't pad with polite phrasing that adds length without adding clarity (avoid
  constructions like "Veuillez noter que..." where a direct statement will do,
  unless the direct version would read as curt for an instruction to staff).

## German

- Register: **Sie**, always. Never du.
- German compounds run long — for buttons/badges, prefer the shorter of two
  correct options, and don't be afraid to slightly restructure a phrase to avoid
  an unwieldy compound noun if a clearer short form exists.
- Treat all German strings as provisional/unreviewed by default (see glossary
  `(unreviewed)` convention) until a native or professional reviewer confirms them
  — German's audience and rollout timing aren't finalized yet, so confidence here
  should be lower than for French.
- Default to standard Hochdeutsch with no regional assumptions (not Austrian or
  Swiss German) unless told otherwise.

## Things to avoid in all languages

- Don't invent a new phrasing for a concept that already has a glossary entry,
  even if your new phrasing seems more elegant — consistency across the app beats
  a marginally better one-off translation.
- Don't leave a string partially translated or mix languages in one string.
- Don't translate proper nouns, drug names, or standardized medical
  abbreviations/codes unless the glossary explicitly says to.
