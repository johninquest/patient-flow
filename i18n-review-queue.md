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

### Pending-access terms (added 2026-09-16)

Introduced with Google self-registration: new staff sign in with Google and hold
no role until an admin grants one.

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `staff.roles.pending` | Pending Access | Accès en attente | New term. Not a job function but an account state, so it has no glossary role counterpart. Chosen over bare "En attente" to avoid colliding with the patient-flow "Waiting" term. Confirm it reads as a permission state, not a queue position. |
| `staff.pendingAccess` | Pending Access | Accès en attente | Same string as `staff.roles.pending`, kept as a separate key because one is a dropdown option and the other a status badge — they may diverge later. Confirm the duplication is acceptable. |
| `pending.title` | Access pending | Accès en attente | Waiting-room page heading. |
| `pending.description` | Your account has been created, but an administrator must grant you access before you can use Patient Flow. | Votre compte a été créé, mais un administrateur doit vous accorder l'accès avant que vous puissiez utiliser Patient Flow. | Full sentence, no concatenation. Confirm "Patient Flow" stays untranslated as the product name. |
| `pending.signedInAs` | Signed in as | Connecté en tant que | Gender-neutral form chosen; confirm it is acceptable before a name/email. |
| `pending.checkAgain` | Check again | Vérifier à nouveau | Button label — confirm length fits. |
| `pending.contactAdmin` | If you have been waiting a while, contact your administrator. | Si vous attendez depuis un moment, contactez votre administrateur. | Softer register than `auth.contactAdmin`; confirm the tone is consistent with the rest of the app. |
| `audit.titles.user.registered` | Registered | Inscription | New audit action for a self-service Google signup. Confirm "Inscription" is not confused with `user.created` ("Utilisateur créé"), which is an admin provisioning an account. |
| `staff.roles.clinical_staff` | Clinical Staff | Personnel infirmier | **Changed** from "Personnel clinique" to align with the glossary (Nurse = Personnel infirmier). Note the app slug is broader than "nurse" — if this role ever covers non-nursing clinical staff, a broader term may be needed. |

### Register / terminology decisions

| Key | Source (EN) | Proposed (FR) | Reason flagged |
|---|---|---|---|
| `flow.title` | Patient Flow | Parcours patients | "Parcours patients" is standard French healthcare vocabulary for the patient journey. Confirm it reads correctly as a navigation label. |
| `encounters.checkIn` | Check In | Enregistrer l'arrivée | Chosen over the shorter "Arrivée" for clarity as an action button. Verify it fits the button width. |
| `tasks.blocking` | Blocking | Bloquant | Confirm this reads as a task property (adjective) rather than an action. |

> **Resolved (2026-09-16):** `flow.tasksProgress` was reworked into CLDR plural
> keys — `tasksProgress_one` / `tasksProgress_other` (EN: `{{done}}/{{count}} task`
> / `... tasks`; FR: `{{done}}/{{count}} tâche` / `... tâches`). The open question
> about the fixed "tâches" form at `total` 1 is answered: the noun now agrees with
> the *total* task count, so a single-task encounter reads "1/1 tâche".
> Pluralisation is driven by `{{count}}` (i18next's plural variable) carrying the
> total, while `{{done}}` carries the completed count.
>
> The original single-brace `{done}` placeholders were also rendering literally in
> the UI, because i18next substitutes double-braced names — see the placeholder
> checks now enforced by `pnpm run i18n:check`.

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
