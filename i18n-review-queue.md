# i18n Review Queue

Strings that need human review before they can be considered final. Entries are
added by the agent when a translation is uncertain, clinically sensitive, or
introduced a new term — see `.github/skills/clinic-i18n/SKILL.md`.

**Why this file exists:** locale files are strict JSON and cannot hold
`// i18n-review:` comments, so review flags live here instead.

**Reviewer:** _not yet assigned_

---

## How to use

1. Pick an entry, check the proposed translation against the source meaning.
2. If correct, delete the row and (for new terms) remove the `(unreviewed)` tag
   in `glossary.md`.
3. If incorrect, update the locale file and note the correction.

---

## Open items

### New clinical terms (added 2026-09-15)

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `encounters.statuses.no_show` | No Show | Absent | New FSM status. "Absent" is the standard French clinic term for a patient who did not attend, but confirm it is not confused with "Annulé" (cancelled) in the UI. |
| `encounters.phases.awaiting_lab` | Awaiting Lab | En attente de laboratoire | New term. Distinguish clearly from `awaiting_results` — a mistranslation here is safety-adjacent. |
| `encounters.phases.awaiting_results` | Awaiting Results | En attente des résultats | New term. High-stakes pair with `awaiting_lab`; verify the two are never visually confusable. |
| `encounters.phases.treatment` | Treatment | Traitement | New term. |
| `encounters.phases.discharge` | Ready for Discharge | Prêt(e) pour la sortie | Matches existing glossary entry. Confirm the `Prêt(e)` slash form is acceptable in a button label. |
| `encounters.phases.consultation` | Consultation | Consultation | Identical in both languages — no translation risk, listed for completeness. |

### Role label realignment (added 2026-09-15)

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `staff.roles.provider` | Provider | Médecin | **Changed** from "Prestataire" to align with the glossary (Doctor = Médecin). "Prestataire" reads as a contractor/vendor in French and was misleading for a clinical role. Confirm this is the right label for the `provider` slug. |
| `staff.roles.clinical_staff` | Clinical Staff | Personnel infirmier | **Changed** from "Personnel clinique" to align with the glossary (Nurse = Personnel infirmier). Note the app slug is broader than "nurse" — if this role ever covers non-nursing clinical staff, a broader term may be needed. |

### Register / terminology decisions

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `flow.title` | Patient Flow | Parcours patients | "Parcours patients" is standard French healthcare vocabulary for the patient journey. Confirm it reads correctly as a navigation label. |
| `encounters.checkIn` | Check In | Enregistrer l'arrivée | Chosen over the shorter "Arrivée" for clarity as an action button. Verify it fits the button width. |
| `tasks.blocking` | Blocking | Bloquant | Confirm this reads as a task property (adjective) rather than an action. |
| `flow.tasksProgress` | {done}/{total} tasks | {done}/{total} tâches | Uses a named-placeholder pattern. French pluralisation is handled by the fixed "tâches" form — verify it reads acceptably when `total` is 1. |

### Activity timeline titles (added 2026-09-16)

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `audit.titles.patient.created` | Patient created | Patient créé | French past-participle gender agreement with "patient" (masculine vs feminine patient) — epicene form "créé" chosen as default. |
| `audit.titles.encounter.created` | Encounter created | Consultation créée | Feminine agreement ("consultation") confirmed. |
| `audit.titles.encounter.updated` | Encounter updated | Consultation modifiée | Feminine agreement for "consultation". |
| `audit.titles.user.status_changed` | Account status changed | Statut du compte modifié | "compte" (m.) → "modifié". |
| `audit.titles.admin.seeded` | Admin granted | Administrateur accordé | Past-participle phrasing for an out-of-band promotion; confirm "accordé" reads as "granted". |
| `audit.notSet` | Not set | Non défini | Fallback for null/undefined diff values; confirm "Non défini" over "Non renseigné". |

---

_None yet._
