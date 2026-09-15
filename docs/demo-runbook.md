# Demo Runbook — Patient Flow

A scripted walkthrough of a classic clinic patient journey for a prospective
customer (a doctor). Two entry paths converge on the same care journey:

- **Path A — Booked appointment:** front desk books ahead, patient arrives.
- **Path B — Walk-in:** patient arrives unannounced.

Both then flow: **front desk → nurse → doctor → nurse → doctor → front desk**.

---

## 1. Before the demo (do this the day before)

### 1.1 Start the stack

```bash
docker-compose up -d
docker-compose exec api pnpm run db:migrate
```

Confirm the API is up at `http://localhost:3000/api/docs` and the client at
`http://localhost:5173`.

### 1.2 Create the staff accounts

Sign in as the admin (`ADMIN_EMAIL` from `apps/api/.env`), then go to
**Staff → New Staff** and create four accounts. Use real-looking names — the
demo is more convincing when the assignee dropdown shows people, not `test1`.

| Name | Email | Role | Title |
|---|---|---|---|
| Awa Ndiaye | `awa@clinic.demo` | `front_desk` | Front Desk |
| Fatou Sow | `fatou@clinic.demo` | `clinical_staff` | Nurse |
| Dr. Kwame Mensah | `kwame@clinic.demo` | `provider` | Doctor |
| (yourself) | — | `admin` | — |

Use the same password for all demo accounts and write it down.

### 1.3 Create the patients

Go to **Patients → New Patient** and create two:

| Name | Date of birth | Notes |
|---|---|---|
| Amara Diallo | any | The **booked** patient (Path A) |
| Ibrahim Traoré | any | The **walk-in** patient (Path B) |

> Patient creation is restricted to `clinical_staff` and `admin` (ADR 0002), so
> create these while signed in as admin or as the nurse.

### 1.4 Book the appointment

Go to **Encounters → New Encounter**:

- Patient: **Amara Diallo**
- Scheduled time: **today**, a couple of hours from now
- Assign to: leave unassigned (the doctor will take ownership live)

This gives Path A a pre-booked appointment to show on the schedule.

### 1.5 Verify the board is clean

Open **Patient Flow**. You should see Amara's encounter in the *Scheduled*
column and nothing else. If there is leftover test data, delete it — a clean
board makes the demo land better.

---

## 2. Window setup (critical)

> **⚠️ Two windows in the same browser share cookies, so both would be the same
> user.** You must use two separate browser sessions.

| Window | Browser | Signed in as | Purpose |
|---|---|---|---|
| **Left** | Normal Chrome/Edge | Dr. Kwame Mensah (`provider`) | The doctor's view |
| **Right** | **Incognito** window | Fatou Sow (`clinical_staff`) | The nurse's view |

Optionally a third incognito window as Awa Ndiaye (`front_desk`) if you want the
front desk visible simultaneously — but switching the right-hand window between
nurse and front desk is usually smoother than juggling three.

**Arrange them side by side** so the audience sees both at once. This is the
whole point: a handoff made on the left appears on the right without a refresh.

> The Patient Flow board polls every 10 seconds, so changes propagate on their
> own. If you need it instantly, click to another tab and back.

---

## 3. The script

### Act 1 — The booked appointment (Path A)

**Window: right (front desk)**

1. Open **Encounters**. Point out the **Upcoming** tab — Amara's appointment is
   grouped under **Today** with her scheduled time.
2. Say: *"This is the day's schedule. The front desk sees who's coming and when."*
3. Open Amara's encounter. Click **Check In**.
4. Point out the status changed to **Checked In** and the **Activity** tab now
   shows who did it and when.

**Window: right (switch to nurse — Fatou)**

5. Open **Patient Flow**. Amara has moved from *Scheduled* to *Checked In*.
6. Say: *"Nobody had to tell the nurse she'd arrived. It's just there."*
7. Open Amara's encounter → **Tasks** tab → **New Task**:
   - Title: `Take vitals and pain score`
   - Priority: `High`
   - Assign to: **Dr. Kwame Mensah**
   - Save.
8. Say: *"The nurse has done triage and is handing the patient to the doctor."*

**Window: left (doctor — Dr. Kwame)**

9. Open **Patient Flow** — the task count on Amara's card shows `0/1`.
10. Open Amara's encounter → **Tasks** tab. The vitals task is there, assigned
    to the doctor.
11. Click **Start** to move the encounter to **In Progress**.
12. The **Encounter Phase** panel appears. Click **Consultation**.
13. Say: *"The doctor has taken ownership. The system now locks this encounter to
    him — another clinician can't accidentally pick it up."*
14. Create two tasks for the nurse:
    - `Draw blood panel` — priority `High`, **Blocking** checked, assign to Fatou
    - `Administer analgesic` — priority `Medium`, assign to Fatou
15. Say: *"Orders go straight to the nurse's queue. The blood panel is flagged
    blocking — the encounter can't be discharged until it's done."*

### Act 2 — The walk-in (Path B)

**Window: right (switch to front desk — Awa)**

16. Open **Encounters → New Encounter**:
    - Patient: **Ibrahim Traoré**
    - **Leave the scheduled time empty** — this is a walk-in
    - Save.
17. Say: *"Not every patient books. A walk-in is the same record, just without a
    scheduled time."*
18. Click **Check In**.
19. Open **Patient Flow** — Ibrahim now sits in *Checked In* alongside Amara.
20. Say: *"Both patients are in the same flow, regardless of how they arrived."*

### Act 3 — Results and discharge

**Window: right (nurse — Fatou)**

21. Open Amara's encounter → **Tasks** tab. Set both tasks to **Done**.
22. Say: *"Labs are drawn, medication given."*

**Window: left (doctor — Dr. Kwame)**

23. Open **Patient Flow** — Amara's card now shows `2/2 tasks` and the
    **Blocked** flag is gone.
24. Open Amara's encounter. Click **Awaiting Results** in the phase panel.
25. Say: *"The doctor can see at a glance that the patient is waiting on results,
    not sitting in a room wondering what's next."*
26. Click **Treatment**, then **Ready for Discharge**.
27. Click **Complete**.
28. Point out the phase cleared automatically and the status is **Completed**.
29. Open the **Activity** tab. Say: *"Every step is logged — who did what, when,
    and what changed. This is your audit trail."*

### Act 4 — Back to the front desk

**Window: right (front desk — Awa)**

30. Open **Patient Flow** — Amara is in *Completed*.
31. Open **Encounters → Completed** tab — she's there for follow-up scheduling.
32. Say: *"The loop closes. The front desk sees the visit finished and can book
    the follow-up — with the full history attached."*

### Optional — No-show

33. On Ibrahim's encounter, click **No Show**.
34. Say: *"And when a patient doesn't turn up, that's recorded distinctly from a
    cancellation — so you can actually measure no-show rates."*

---

## 4. Talking points

- **No verbal handoffs.** Every transition is visible to the next person.
- **Ownership lock.** An in-progress encounter can't be grabbed by someone else.
- **Blocking tasks.** The system knows when an encounter can't proceed.
- **Full audit trail.** Every change is attributed and timestamped.
- **One model, two entry paths.** Booked and walk-in are the same record.
- **Bilingual.** Switch EN/FR from the sidebar to show it's not an afterthought.

---

## 5. If something goes wrong

| Symptom | Fix |
|---|---|
| Both windows show the same user | You're in the same browser session. Use a real incognito window. |
| Board looks stale | It polls every 10s. Switch tabs and back, or reload. |
| "Only the assigned staff member or admin can update" | The encounter is locked to another user. Sign in as that user, or as admin. |
| Task creation fails | Check the browser console — the API rejects unknown fields. |
| Raw translation keys appear | A key is missing. Run `pnpm --filter patient-flow-client run i18n:check`. |
| Phase buttons don't appear | Phase only applies while the encounter is **In Progress**. |

---

## 6. Reset between rehearsals

To run the demo again from a clean state, either:

- Delete the demo encounters via the API/DB and re-create them, or
- Recreate the two patients and start fresh.

Keep the staff accounts — they don't need resetting.
