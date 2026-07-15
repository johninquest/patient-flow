# Collapse Patient DTOs and Inline Visibility Policy

**Date:** 2026-07-15  
**Status:** decided  
**Supersedes:** partially supersedes the DTO/visibility structure introduced in `0004-patient-data-model-expansion-with-role-based-visibility.md`

## Problem

After the patient data model expansion (ADR 0004), the `patients` module had grown to **9 files** for what is conceptually one entity:

- 6 sub-DTO files (`address.dto.ts`, `identity.dto.ts`, `financials.dto.ts`, `emergency-contact.dto.ts`, `physicians.dto.ts`, `transport-logistics.dto.ts`) — one per `jsonb` nested object
- 2 main DTO files (`create-patient.dto.ts`, `update-patient.dto.ts`) that existed only to compose the 6 sub-DTOs via `@ValidateNested()` + `@Type()`
- 1 separate `patient-visibility.ts` file holding the role→section matrices and two pure functions (`filterPatientByRole`, `assertCanWriteFields`)

Two concerns surfaced on review:

1. **The sub-DTOs carried almost no validation value.** Every field across all 6 sub-DTOs was `@IsOptional() @IsString()` (with one `@IsBoolean()`). Six files of maintenance existed to reject non-string values in optional nested `jsonb` fields — while the `jsonb` columns are intentionally flexible blobs. The structure was fighting the schema design.

2. **The visibility file was false separation.** `patient-visibility.ts` was consumed exclusively by `PatientsService`. It was not a shared utility, not a guard, not a generic helper. It was patient-specific authorization policy sitting one import away from the only place that used it. The "separation of concerns" argument was weak because the concern is *patient* visibility, and this is the *patients* module — it was already separated by being in its own module.

## Decision

Collapse the module from 9 files down to 4, with **zero behavior change**.

### 1. Inline sub-DTOs into the main DTO files

Move the class bodies of all 6 sub-DTOs (`AddressDto`, `IdentityDto`, `FinancialsDto`, `EmergencyContactDto`, `PhysiciansDto`, `TransportModesDto`, `TransportLogisticsDto`) directly into `create-patient.dto.ts` and `update-patient.dto.ts`, declared above their parent DTO class.

- All `@ValidateNested()` + `@Type(() => X)` decorators are preserved, so deep validation behavior is identical.
- Swagger nested-shape documentation is preserved (the sub-DTO classes still exist, just co-located).
- Delete the 6 standalone sub-DTO files.

### 2. Fold visibility policy into PatientsService

Move the `SECTION_FIELDS`, `PATIENT_READ_VISIBILITY`, `PATIENT_WRITE_VISIBILITY` constants and the `Role` / `PatientSection` types to module scope in `patients.service.ts`. Convert the two functions to private methods:

- `filterPatientByRole()` → `private filterByRole<T>()`
- `assertCanWriteFields()` → `private assertCanWrite()`

Update all call sites to use `this.filterByRole(...)` / `this.assertCanWrite(...)`. Delete `patient-visibility.ts`.

### Resulting structure

```
api/src/modules/patients/
  patients.controller.ts
  patients.module.ts
  patients.service.ts          # now holds visibility policy + methods
  dto/
    create-patient.dto.ts      # inlined sub-DTOs
    update-patient.dto.ts      # inlined sub-DTOs
```

## Rationale

1. **Validation value vs. maintenance cost.** The sub-DTOs enforced `@IsOptional() @IsString()` on nearly every field — a marginal guard against non-string values in optional `jsonb` fields. Six files of maintenance for that level of validation is a poor trade. Inlining preserves the (small) validation value while removing the file proliferation and import indirection.

2. **Co-location over premature extraction.** The visibility policy is patient-specific and has a single consumer (`PatientsService`). Extracting it into its own file added a layer of indirection without any reuse benefit. The patients module is already the boundary; the policy belongs with the service that enforces it. If the rules later need to be shared across modules (e.g., encounters needing patient-section visibility), they can be extracted at that time — YAGNI for now.

3. **One DTO per object is not a requirement.** The "one DTO per nested object" pattern is sometimes justified when nested objects have complex validation rules, are shared across multiple endpoints, or are independently documented. None of those apply here: the nested objects are simple, used only by patient create/update, and their Swagger shape is preserved by inlining.

4. **Pure structural refactor.** No validation rules, visibility matrices, audit calls, or HTTP responses changed. This reduces risk — the refactor can be verified by lint + build + existing tests, with no need to re-derive behavior.

## Alternatives Considered

- **Drop deep validation, use `@IsObject()` on jsonb fields.** Simplest (2 files, no nested classes), but loses Swagger nested-shape docs and the (small) deep validation. Rejected — inlining keeps both at the cost of slightly longer DTO files.
- **Co-locate all sub-DTOs in one `patient-sub-dtos.ts`.** 3 files instead of 9. Preserves everything, just fewer files. Rejected — still leaves an extra file of indirection when the sub-DTOs are only used by the two main DTOs.
- **Keep `patient-visibility.ts` as a separate file.** Justified only if visibility rules grow complex or are shared across modules. Rejected for now — single consumer, stable rules.

## Consequences

- **Positive:** Module file count drops from 9 to 4. New contributors find patient DTOs and visibility logic in the two places they'd naturally look (the DTO files and the service). Less import indirection. Easier to see the full shape of a patient create/update request at a glance.
- **Positive:** Visibility policy is co-located with the service that enforces it, making the authorization story for patient reads/writes easier to audit in one place.
- **Negative:** `create-patient.dto.ts` and `update-patient.dto.ts` now contain duplicate sub-DTO class declarations (both files declare `AddressDto`, `IdentityDto`, etc.). This matches the project convention of separate create/update DTOs and is accepted as a minor tradeoff.
- **Negative:** Visibility policy is no longer independently unit-testable without instantiating the service. If isolated testing of the matrices becomes important, extract back out to a file or a small helper class at that time.
- **Neutral:** Swagger nested-shape docs and deep validation are preserved — no API contract change, no frontend impact.

## Verification

- `npm run lint` — no patients-module errors (pre-existing errors in other modules unchanged)
- `npm run build` — compiles clean
- `npm test` — 2 pass, 0 fail (existing tests unchanged)
- Grep confirmed zero remaining references to the deleted files before deletion
