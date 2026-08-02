# ISO Standard Country and Currency Data

**Date:** 2026-07-21  
**Status:** decided

## Problem

Patient records store country information in two places (`address.country` and `identity.country_national`) and need to support currency information (`financials.currency`). These fields were previously free-text strings with no validation or standardization, leading to:

1. **Inconsistent data entry** — users could enter "France", "FR", "fr", "French Republic", or any variation
2. **No validation** — invalid country codes or currency codes could be stored without error
3. **Localization challenges** — displaying country/currency names in different languages (en/fr) required either storing multiple language versions or maintaining translation tables
4. **Integration friction** — external systems expect standardized ISO codes, not free-text values

The system needs a lightweight, standards-compliant approach that validates data at the API boundary while supporting multilingual display without backend complexity.

## Decision

Store **ISO 3166-1 alpha-2 country codes** (e.g., "FR", "US") and **ISO 4217 currency codes** (e.g., "EUR", "USD") in the database. Validate codes at the API boundary using static arrays. Resolve display names on the frontend using the browser's `Intl.DisplayNames` API.

### Implementation

**Backend (API):**
- Create `apps/api/src/core/common/iso-codes.ts` with static arrays of all valid ISO 3166-1 alpha-2 country codes (~249) and ISO 4217 currency codes (~180)
- Add `@IsIn(ISO_COUNTRY_CODES)` validation to `AddressDto.country` and `IdentityDto.country_national` fields
- Add new `FinancialsDto.currency` field with `@IsIn(ISO_CURRENCY_CODES)` validation
- No database schema changes — fields remain `jsonb` with string values
- No new API endpoints or lookup tables

**Frontend (Client):**
- Create `apps/client/src/lib/iso-data.ts` utility module with:
  - `getCountryName(code, locale)` — wraps `Intl.DisplayNames` with `type: 'region'`
  - `getCurrencyName(code, locale)` — wraps `Intl.DisplayNames` with `type: 'currency'`
  - `getCountryOptions(locale)` — returns sorted array of `{ value, label }` for all countries
  - `getCurrencyOptions(locale)` — returns sorted array of `{ value, label }` for all currencies
  - `COUNTRY_DEFAULT_CURRENCY` — mapping of country codes to default currency codes (e.g., `{ FR: 'EUR', US: 'USD' }`)
- Create `FormSelect` design system component for dropdown selection
- Update `PatientForm.tsx` to use `FormSelect` for country/currency fields with auto-suggest (selecting a country auto-fills the default currency)
- Update `PatientDetail.tsx` to resolve ISO codes to localized display names
- Add i18n keys for "currency", "selectCountry", "selectCurrency" in en.json and fr.json

**Contracts:**
- Update `docs/contracts/schema.md` to document ISO code constraints on `address.country`, `identity.country_national`, and `financials.currency`
- Update `docs/contracts/api_spec.md` to reflect ISO code validation in request/response shapes

### Data Migration

Existing patient records with free-text country values (e.g., "France" instead of "FR") will display the raw string until edited. No automated migration is performed — users can update records through the normal edit flow.

## Rationale

1. **Standards compliance over custom solutions.** ISO 3166-1 and ISO 4217 are internationally recognized standards. Using them ensures data portability, integration compatibility, and alignment with external systems (payment processors, address validation services, etc.).

2. **Browser-native localization.** `Intl.DisplayNames` is a built-in browser API that provides localized names for regions, currencies, languages, and scripts. It supports all modern browsers, requires zero dependencies, and automatically handles en/fr translations based on the user's locale. This eliminates the need for backend translation tables or i18n files with country/currency names.

3. **Validation at the boundary, flexibility in storage.** DTO-level `@IsIn()` validation ensures only valid ISO codes enter the system, while `jsonb` storage maintains schema flexibility. This matches the project's pattern of validating at the API edge while keeping the database schema adaptable.

4. **No backend bloat.** The alternative of creating `countries` and `currencies` lookup tables with seed data, API endpoints, and foreign key relationships would add significant complexity for minimal benefit. The ISO code lists are stable (change rarely), universally available, and don't require clinic-specific customization.

5. **Auto-suggest improves UX.** When a user selects a country, auto-filling the default currency reduces friction while still allowing manual override. This balances convenience with flexibility for edge cases (e.g., a French patient paying in USD).

6. **Consistent with project philosophy.** This approach aligns with the project's "lightweight coordination layer" identity — it adds standardization without introducing heavy infrastructure (no new tables, no seed data, no new endpoints).

## Alternatives Considered

- **Backend lookup tables with seed data.** Create `countries` and `currencies` tables, populate with ~250 countries and ~180 currencies, expose via API endpoints. Rejected — adds significant complexity (migrations, seed scripts, endpoints, caching) for data that is universally available via browser APIs and rarely changes.

- **Free-text with no validation.** Keep fields as unvalidated strings. Rejected — allows inconsistent data entry ("France" vs "FR" vs "fr"), breaks integration with external systems, and makes analytics/reporting difficult.

- **Custom i18n files for country/currency names.** Maintain `countries.en.json` and `countries.fr.json` with all country names. Rejected — duplicates data already available via `Intl.DisplayNames`, requires manual maintenance, and doesn't scale if additional locales are added.

- **Third-party library (e.g., `i18n-iso-countries`).** Use an npm package for ISO code validation and name resolution. Rejected — adds a dependency for functionality that is trivial to implement with static arrays and browser APIs.

## Consequences

- **Positive:** Data is standardized and validated at the API boundary. Invalid country/currency codes are rejected with clear error messages.
- **Positive:** Multilingual display (en/fr) works automatically via `Intl.DisplayNames` with zero backend effort.
- **Positive:** No new database tables, migrations, seed data, or API endpoints required.
- **Positive:** Improved UX with country → currency auto-suggest while preserving manual override.
- **Positive:** Data is portable and integration-ready — external systems expect ISO codes.
- **Negative:** Existing records with free-text country values will display the raw string until manually edited. This is acceptable for a small dataset and can be addressed through normal data entry workflows.
- **Negative:** `Intl.DisplayNames` requires modern browsers (no IE11 support). This is acceptable given the project's browser support policy.
- **Neutral:** ISO code lists are duplicated between backend (`apps/api/src/core/common/iso-codes.ts`) and frontend (`apps/client/src/lib/iso-data.ts`). This is intentional — the lists are small, stable, and the duplication avoids cross-package imports in a monorepo.

## Verification

- **Backend validation:** POST a patient with `address.country: "XX"` → expect 400 Bad Request with message "country must be a valid ISO 3166-1 alpha-2 code"
- **Backend validation:** POST a patient with `financials.currency: "ZZZ"` → expect 400 Bad Request with message "currency must be a valid ISO 4217 code"
- **Backend acceptance:** POST a patient with `address.country: "FR"`, `identity.country_national: "US"`, `financials.currency: "EUR"` → expect 201 Created
- **Frontend form:** Open patient form → country dropdown shows localized names sorted alphabetically (e.g., "France", "United States" in English; "France", "États-Unis" in French)
- **Frontend auto-suggest:** Select "France" in country dropdown → currency field auto-fills to "EUR"
- **Frontend override:** After auto-fill, manually change currency to "USD" → value persists correctly
- **Frontend detail:** View patient detail → country displays as "France" (en) or "France" (fr), currency displays as "Euro" (en) or "euro" (fr)
- **i18n:** Switch language to French → all country/currency names resolve in French via `Intl.DisplayNames`
- **Existing data:** Existing patients with free-text country values display the raw string until edited (acceptable — no migration required)
