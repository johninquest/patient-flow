# Clinic Glossary (EN → FR / DE)

This is the single source of truth for recurring clinical and workflow terms.
**Rule: check here before translating any term that will appear more than once.
Add new terms here the moment you translate them for the first time — don't let
a term exist in a locale file before it exists here.**

Status: DE column marked `(unreviewed)` until a human confirms it — treat those
as provisional even if they look confident.

## Format

Each entry: English term | French | German | Notes

## Patient flow statuses

| English | French | German | Notes |
|---|---|---|---|
| Waiting | En attente | Wartend (unreviewed) | Generic queue state — used across reception, triage, lab, imaging. Same term everywhere; do not vary by department. |
| In triage | En triage | In der Triage (unreviewed) | |
| In consultation | En consultation | In Konsultation (unreviewed) | |
| Lab result pending | Résultat de laboratoire en attente | Laborergebnis ausstehend (unreviewed) | Distinct key from generic "Waiting" — do not reuse the "Waiting" key here even though English word overlaps. |
| Lab result ready | Résultat de laboratoire disponible | Laborergebnis verfügbar (unreviewed) | High-stakes string — confirm this is never confused with "pending" in translation review. |
| Ready for discharge | Prêt(e) pour la sortie | Entlassbereit (unreviewed) | French: gender-neutral written form `Prêt(e)` acceptable in UI; prefer full inclusive phrasing in printed documents if that scope is ever added. |
| Referred to specialist | Référé(e) à un spécialiste | An Facharzt überwiesen (unreviewed) | |

## Encounter lifecycle statuses

These map to the `encounters.status` column and the workflow FSM. They are
**distinct from the patient flow statuses above** — do not reuse keys across the
two tables.

| English | French | German | Notes |
|---|---|---|---|
| Scheduled | Planifié | Geplant (unreviewed) | Encounter booked but patient not yet arrived. |
| Checked in | Arrivé | Eingecheckt (unreviewed) | Patient has arrived at reception. |
| In progress | En cours | In Bearbeitung (unreviewed) | Care is actively being delivered. |
| Completed | Terminé | Abgeschlossen (unreviewed) | Encounter finished normally. |
| Cancelled | Annulé | Storniert (unreviewed) | Encounter cancelled before or during care. |
| No show | Absent | Nicht erschienen (unreviewed) | Patient did not attend a booked appointment. Distinct from "Cancelled" — the patient never arrived rather than the visit being called off. |

## Encounter phases (sub-states within "In progress")

Per ADR 0008, `phase` tracks what is happening *within* an in-progress
encounter. These are separate keys from the lifecycle statuses above.

| English | French | German | Notes |
|---|---|---|---|
| Consultation | Consultation | Konsultation (unreviewed) | Clinician examining the patient. |
| Awaiting lab | En attente de laboratoire | Warten auf Labor (unreviewed) | Patient sent for lab work. |
| Awaiting results | En attente des résultats | Warten auf Ergebnisse (unreviewed) | Samples taken, results outstanding. High-stakes: must not be confused with "Awaiting lab". |
| Treatment | Traitement | Behandlung (unreviewed) | Treatment being administered. |
| Ready for discharge | Prêt(e) pour la sortie | Entlassbereit (unreviewed) | Same term as the patient flow status — intentionally consistent. |

## Task terms

| English | French | German | Notes |
|---|---|---|---|
| Task | Tâche | Aufgabe (unreviewed) | |
| To do | À faire | Zu erledigen (unreviewed) | |
| Done | Terminé | Erledigt (unreviewed) | |
| Blocking | Bloquant | Blockierend (unreviewed) | A task that prevents the encounter from progressing. |
| Unassigned | Non assigné | Nicht zugewiesen (unreviewed) | |
| Priority | Priorité | Priorität (unreviewed) | |
| Low / Medium / High | Faible / Moyenne / Élevée | Niedrig / Mittel / Hoch (unreviewed) | |

## Roles

| English | French | German | Notes |
|---|---|---|---|
| Frontdesk | Accueil | Empfang (unreviewed) | |
| Nurse | Infirmier/Infirmière (UI: use neutral "Personnel infirmier" where space allows) | Pflegefachperson (unreviewed) | German term chosen for gender neutrality — confirm with reviewer. |
| Doctor | Médecin | Arzt/Ärztin (unreviewed) — needs neutral alternative review | Médecin is already gender-neutral in French, use it as default over "docteur." |
| Lab technician | Technicien(ne) de laboratoire | Labortechniker(in) (unreviewed) | |
| Medical physicist | Physicien(ne) médical(e) | Medizinphysiker(in) (unreviewed) | |
| IT admin | Administrateur/Administratrice IT | IT-Administrator(in) (unreviewed) | |

### App role slugs → glossary terms

The application's role slugs do not map one-to-one onto the glossary role names
above. This table is the authoritative mapping used by `staff.roles.*` in the
locale files.

| App slug | English label | French label | Glossary term |
|---|---|---|---|
| `admin` | Admin | Administrateur | IT admin |
| `provider` | Provider | **Médecin** | Doctor |
| `clinical_staff` | Clinical Staff | **Personnel infirmier** | Nurse |
| `front_desk` | Front Desk | Accueil | Frontdesk |
| `pending` | Pending Access | **Accès en attente** | — (no glossary role; see note) |

> **Note:** `provider` and `clinical_staff` were previously translated as
> "Prestataire" and "Personnel clinique". Both were realigned to the glossary
> terms above — see `i18n-review-queue.md`.

> **Note:** `pending` is not a job function, so it has no counterpart in the
> Roles table above. It is an account state — signed in, but not yet granted a
> role. "Accès en attente" was chosen over "En attente" alone so the label
> reads as a permission state rather than a queue position, which would collide
> with the patient-flow "Waiting" term.

## Account access states

Distinct from the Roles table: these describe whether an account may use the
app at all, not what job the person does.

| English | French | German | Notes |
|---|---|---|---|
| Pending access | Accès en attente | Zugang ausstehend (unreviewed) | Signed in but granted no role yet. Must not be confused with "Waiting" (patient queue) or "Suspended" (account disabled). |
| Active | Actif | Aktiv (unreviewed) | Account may use the app. |
| Suspended | Suspendu | Gesperrt (unreviewed) | Account disabled by an admin. Distinct from "Pending access" — a suspended user is blocked, a pending one is merely unprivileged. |

## Common UI actions

| English | French | German | Notes |
|---|---|---|---|
| Save | Enregistrer | Speichern (unreviewed) | |
| Cancel | Annuler | Abbrechen (unreviewed) | |
| Confirm | Confirmer | Bestätigen (unreviewed) | |
| Edit | Modifier | Bearbeiten (unreviewed) | |
| Delete | Supprimer | Löschen (unreviewed) | |

## How to extend this table

1. New term appears in a PR → check this table first.
2. Not present → propose FR (and DE if in scope) translation, add a row, mark DE
   `(unreviewed)`, and log it in `i18n-review-queue.md` per the main SKILL.md.
3. Once a human reviewer confirms a term, remove the `(unreviewed)` tag for that
   language and note the reviewer/date in a trailing comment if useful.
