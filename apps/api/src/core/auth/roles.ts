/**
 * The canonical role vocabulary for Patient Flow.
 *
 * There are two distinct sets, and conflating them is a security bug:
 *
 * - `ASSIGNABLE_ROLES` — real access levels. Any user holding one of these has
 *   a non-empty CASL ability (see `ability.ts`) and may use the app.
 * - `ALL_ROLES` — the above plus `pending`, the "authenticated but no access"
 *   state a new staff member holds between signing up with Google and being
 *   granted a role by an admin.
 *
 * Only admins may move a user *into* a role, so `ALL_ROLES` is the correct set
 * for the update schema (an admin must be able to revoke access by setting a
 * user back to `pending`). `ASSIGNABLE_ROLES` is the correct set for the create
 * schema, because minting a user who cannot do anything is never the intent of
 * "New Staff" — that would produce a broken account, not a pending one.
 */

/** Access levels that grant real permissions. Ordered most- to least-privileged. */
export const ASSIGNABLE_ROLES = [
  'admin',
  'provider',
  'clinical_staff',
  'front_desk',
] as const;

/** `pending` — signed in, but deliberately granted nothing. */
export const PENDING_ROLE = 'pending';

/**
 * Every value `user.role` is allowed to hold.
 *
 * Also the column default, so a user created by any path that does not
 * explicitly set a role — notably a self-service Google signup — fails closed
 * instead of inheriting an access level.
 */
export const ALL_ROLES = [...ASSIGNABLE_ROLES, PENDING_ROLE] as const;

export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];
export type Role = (typeof ALL_ROLES)[number];

/** Narrows an arbitrary string to a known role. */
export function isRole(value: string): value is Role {
  return (ALL_ROLES as readonly string[]).includes(value);
}

/** True for roles that grant at least one permission. */
export function isAssignableRole(value: string): value is AssignableRole {
  return (ASSIGNABLE_ROLES as readonly string[]).includes(value);
}
