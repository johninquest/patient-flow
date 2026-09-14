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

## Roles

| English | French | German | Notes |
|---|---|---|---|
| Frontdesk | Accueil | Empfang (unreviewed) | |
| Nurse | Infirmier/Infirmière (UI: use neutral "Personnel infirmier" where space allows) | Pflegefachperson (unreviewed) | German term chosen for gender neutrality — confirm with reviewer. |
| Doctor | Médecin | Arzt/Ärztin (unreviewed) — needs neutral alternative review | Médecin is already gender-neutral in French, use it as default over "docteur." |
| Lab technician | Technicien(ne) de laboratoire | Labortechniker(in) (unreviewed) | |
| Medical physicist | Physicien(ne) médical(e) | Medizinphysiker(in) (unreviewed) | |
| IT admin | Administrateur/Administratrice IT | IT-Administrator(in) (unreviewed) | |

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
