/**
 * ICD-10 diagnosis shortlist.
 *
 * A deliberately small, curated list — **not** a complete coding system.
 * `requirements/plan_v1.md` lists "deep medical coding systems (ICD, CPT
 * automation)" as an explicit non-goal, so this exists to make the common cases
 * pickable and consistent rather than to encode a terminology.
 *
 * ## Why this is static code and not a database table
 *
 * It is reference data with no PHI, no per-clinic variation and no runtime
 * mutation. A table would need a seed migration and a join for no benefit; the
 * list changes only when a developer edits this file. The API serves it so the
 * client and server share one source of truth.
 *
 * ## `slug` exists for a reason
 *
 * `patient_problems.diagnosis_slug` persists the slug of whatever was picked.
 * That distinguishes a catalogue selection from free text that happens to read
 * the same, and it is the key a future per-locale name lookup would use. Storing
 * it now means adding translations later needs no data migration.
 *
 * ## i18n EXCEPTION — `name` is English-only, rendered as-is
 *
 * Unlike every other user-facing string in this app, `name` does **not** go
 * through `useTranslation()`. The client renders it verbatim in all locales, so
 * French users see English disease names.
 *
 * This is a deliberate decision (ADR 0021), not an oversight. It is recorded
 * here because it is invisible to tooling: `pnpm run i18n:check` compares *key
 * sets* between locale files, so a string that never becomes a key cannot be
 * detected as missing. The 30 names are listed as pending translation work in
 * `i18n-review-queue.md`.
 *
 * To translate them later: add a `diagnoses.items.<slug>` namespace to
 * `en.json`/`fr.json` and resolve by slug on the client. No migration needed.
 *
 * ## Editing this list
 *
 * - Keep it at **30 items or fewer** (a unit test enforces this).
 * - `code` must be unique (a unit test enforces this).
 * - Changing a `slug` or `code` orphans existing `patient_problems` rows'
 *   catalogue linkage — prefer adding a new entry over editing an existing one.
 * - Add new recurring clinical terms to `.github/skills/clinic-i18n/glossary.md`.
 */

/** Grouping slugs, in display order. Labels are translated client-side. */
export const DIAGNOSIS_GROUPS = [
  'infectious',
  'respiratory',
  'cancer',
  'chronic',
  'other',
] as const;

export type DiagnosisGroup = (typeof DIAGNOSIS_GROUPS)[number];

export interface DiagnosisEntry {
  /** ICD-10 code, e.g. `'B54'`. */
  code: string;
  /** Stable kebab-case key. Persisted on `patient_problems.diagnosis_slug`. */
  slug: string;
  /** Official ICD-10 English name. Rendered as-is — see the i18n note above. */
  name: string;
  group: DiagnosisGroup;
}

/**
 * The shortlist.
 *
 * Weighted toward conditions a West African clinic actually sees, plus the
 * respiratory presentations that dominate primary-care volume and the cancers
 * that drive referral decisions.
 */
export const DIAGNOSES: readonly DiagnosisEntry[] = [
  // --- Infectious / vector-borne — West Africa -------------------------------
  {
    code: 'B54',
    slug: 'malaria',
    name: 'Malaria, unspecified',
    group: 'infectious',
  },
  {
    code: 'B50.9',
    slug: 'malaria-falciparum',
    name: 'Plasmodium falciparum malaria, unspecified',
    group: 'infectious',
  },
  {
    code: 'A09',
    slug: 'gastroenteritis',
    name: 'Diarrhoea and gastroenteritis of presumed infectious origin',
    group: 'infectious',
  },
  {
    code: 'A01.0',
    slug: 'typhoid-fever',
    name: 'Typhoid fever',
    group: 'infectious',
  },
  {
    code: 'A91',
    slug: 'dengue-fever',
    name: 'Dengue fever',
    group: 'infectious',
  },
  {
    code: 'A75.9',
    slug: 'typhus-fever',
    name: 'Typhus fever, unspecified',
    group: 'infectious',
  },
  {
    code: 'A27.9',
    slug: 'leptospirosis',
    name: 'Leptospirosis, unspecified',
    group: 'infectious',
  },
  {
    code: 'B55.0',
    slug: 'visceral-leishmaniasis',
    name: 'Visceral leishmaniasis',
    group: 'infectious',
  },
  {
    code: 'A30.9',
    slug: 'leprosy',
    name: 'Leprosy, unspecified',
    group: 'infectious',
  },
  {
    code: 'B74.9',
    slug: 'filariasis',
    name: 'Filariasis, unspecified',
    group: 'infectious',
  },
  {
    code: 'A33',
    slug: 'tetanus-neonatorum',
    name: 'Tetanus neonatorum',
    group: 'infectious',
  },

  // --- Respiratory / cold-related -------------------------------------------
  {
    code: 'J06.9',
    slug: 'acute-uri',
    name: 'Acute upper respiratory infection, unspecified',
    group: 'respiratory',
  },
  {
    code: 'J00',
    slug: 'common-cold',
    name: 'Acute nasopharyngitis (common cold)',
    group: 'respiratory',
  },
  {
    code: 'J11.1',
    slug: 'influenza',
    name: 'Influenza with other respiratory manifestations, virus not identified',
    group: 'respiratory',
  },
  {
    code: 'J02.9',
    slug: 'acute-pharyngitis',
    name: 'Acute pharyngitis, unspecified',
    group: 'respiratory',
  },
  {
    code: 'J03.9',
    slug: 'acute-tonsillitis',
    name: 'Acute tonsillitis, unspecified',
    group: 'respiratory',
  },
  {
    code: 'J18.9',
    slug: 'pneumonia',
    name: 'Pneumonia, unspecified organism',
    group: 'respiratory',
  },
  {
    code: 'J45.9',
    slug: 'asthma',
    name: 'Asthma, unspecified',
    group: 'respiratory',
  },

  // --- Cancers ---------------------------------------------------------------
  {
    code: 'C50.9',
    slug: 'breast-cancer',
    name: 'Malignant neoplasm of breast, unspecified',
    group: 'cancer',
  },
  {
    code: 'C53.9',
    slug: 'cervical-cancer',
    name: 'Malignant neoplasm of cervix uteri, unspecified',
    group: 'cancer',
  },
  {
    code: 'C61',
    slug: 'prostate-cancer',
    name: 'Malignant neoplasm of prostate',
    group: 'cancer',
  },
  {
    code: 'C18.9',
    slug: 'colon-cancer',
    name: 'Malignant neoplasm of colon, unspecified',
    group: 'cancer',
  },
  {
    code: 'C22.0',
    slug: 'liver-cell-carcinoma',
    name: 'Liver cell carcinoma',
    group: 'cancer',
  },
  {
    code: 'C34.9',
    slug: 'lung-cancer',
    name: 'Malignant neoplasm of bronchus or lung, unspecified',
    group: 'cancer',
  },
  {
    code: 'C91.0',
    slug: 'acute-lymphoblastic-leukaemia',
    name: 'Acute lymphoblastic leukaemia',
    group: 'cancer',
  },

  // --- Chronic / non-communicable -------------------------------------------
  {
    code: 'I10',
    slug: 'hypertension',
    name: 'Essential (primary) hypertension',
    group: 'chronic',
  },
  {
    code: 'E11.9',
    slug: 'type-2-diabetes',
    name: 'Type 2 diabetes mellitus without complications',
    group: 'chronic',
  },
  {
    code: 'I25.9',
    slug: 'chronic-ischaemic-heart-disease',
    name: 'Chronic ischaemic heart disease, unspecified',
    group: 'chronic',
  },
  {
    code: 'N18.9',
    slug: 'chronic-kidney-disease',
    name: 'Chronic kidney disease, unspecified',
    group: 'chronic',
  },
  {
    code: 'F32.9',
    slug: 'depressive-episode',
    name: 'Depressive episode, unspecified',
    group: 'chronic',
  },
];

/** Lookup by ICD-10 code. Used to validate a supplied `code` on a problem. */
const BY_CODE = new Map(DIAGNOSES.map((entry) => [entry.code, entry]));

/** Lookup by catalogue slug. */
const BY_SLUG = new Map(DIAGNOSES.map((entry) => [entry.slug, entry]));

/** The catalogue entry for an ICD-10 code, or `undefined` if not in the list. */
export function findDiagnosisByCode(code: string): DiagnosisEntry | undefined {
  return BY_CODE.get(code);
}

/** The catalogue entry for a slug, or `undefined` if not in the list. */
export function findDiagnosisBySlug(slug: string): DiagnosisEntry | undefined {
  return BY_SLUG.get(slug);
}

/**
 * Validate a `code` / `code_system` / `diagnosis_slug` triple against the
 * catalogue.
 *
 * Returns an error message naming the offending value, or `null` when the triple
 * is acceptable. `code` is the anchor: `code_system` and `diagnosis_slug` are
 * derived from it rather than independently checked, so a client cannot pair
 * code `B54` with an unrelated slug.
 *
 * A triple with no `code` at all is valid — off-list diagnoses are explicitly
 * supported, since the catalogue is a shortlist rather than a coding system.
 */
export function validateDiagnosisCode(input: {
  code?: string | null;
  code_system?: string | null;
  diagnosis_slug?: string | null;
}): string | null {
  const { code, code_system, diagnosis_slug } = input;

  if (code === undefined || code === null || code === '') {
    return null;
  }

  const entry = findDiagnosisByCode(code);
  if (!entry) {
    return `code "${code}" is not in the diagnosis catalogue`;
  }

  if (code_system !== 'ICD-10') {
    return `code_system must be "ICD-10" when code is set`;
  }

  if (diagnosis_slug !== entry.slug) {
    return `diagnosis_slug "${diagnosis_slug ?? ''}" does not match code "${code}" (expected "${entry.slug}")`;
  }

  return null;
}
