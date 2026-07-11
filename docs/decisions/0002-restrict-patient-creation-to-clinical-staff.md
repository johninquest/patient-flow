# Restrict Patient Creation to Clinical Staff and Admins

**Date:** 2026-07-11  
**Status:** decided

## Problem
The patient creation endpoint (`POST /patients`) was open to all authenticated users. In a clinical setting, not every role should be able to create new patient records — front desk staff, for example, should not be adding patients to the system without clinical oversight.

## Decision
Restricted the `POST /patients` endpoint to users with the `clinical_staff` or `admin` role using the existing `@Roles()` decorator and `RolesGuard`. The frontend conditionally renders the "New Patient" button only for these roles.

## Rationale
1. **Clinical accountability** — Patient records represent real individuals in the care system. Creation should be gated by roles with clinical responsibility.
2. **Consistency with existing RBAC** — The `user` module already uses `@Roles('admin')` for staff management. Extending this pattern to patient creation keeps access control uniform.
3. **Defense in depth** — Both the API (server-side guard) and the UI (conditional rendering) enforce the restriction. The UI hides the button to avoid confusion; the API guard is the actual enforcement.
4. **Admin included** — Admins retain full access as they oversee all clinic operations.

Considered allowing `provider` role as well, but deferred — providers typically work with existing patients rather than initiating intake. This can be revisited if workflow needs change.
