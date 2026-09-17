/**
 * Standard option lists for patient intake fields.
 *
 * These are the client-side counterpart to the API's constrained values. The
 * slugs are the persisted identifiers; the labels are resolved through i18n at
 * render time, so this module stays free of user-facing strings.
 *
 * `relation` is deliberately *not* validated server-side (see
 * `docs/contracts/schema.md`), so `isKnownRelation` exists to let the UI decide
 * whether a stored value can be shown as a dropdown selection or must be
 * surfaced as a legacy free-text value.
 */

/** Transport modes a patient may use. Mirrors `TRANSPORT_MODES` in the API. */
export const TRANSPORT_MODE_SLUGS = [
  'public_transport',
  'taxi',
  'ambulance',
] as const;

export type TransportModeSlug = (typeof TRANSPORT_MODE_SLUGS)[number];

/** i18n key suffix for each transport mode label. */
export const TRANSPORT_MODE_LABEL_KEYS: Record<TransportModeSlug, string> = {
  public_transport: 'patients.fields.transportPublic',
  taxi: 'patients.fields.transportTaxi',
  ambulance: 'patients.fields.transportAmbulance',
};

/** Emergency-contact relationship slugs, in display order. */
export const RELATION_SLUGS = [
  'partner',
  'parent',
  'child',
  'sibling',
  'grandparent',
  'other_relative',
  'friend_neighbour',
  'carer',
  'other',
] as const;

export type RelationSlug = (typeof RELATION_SLUGS)[number];

const RELATION_SLUG_SET: ReadonlySet<string> = new Set(RELATION_SLUGS);

/** True when a stored relation value is one of the standard-list slugs. */
export function isKnownRelation(value: string | undefined | null): boolean {
  return typeof value === 'string' && RELATION_SLUG_SET.has(value);
}

/**
 * Normalise a stored `transport_logistics.modes` value into an array of slugs.
 *
 * Records written before transport modes became a multi-select stored an object
 * of free-text details (`{ public_transport: 'Bus 21', taxi: '', ... }`). Those
 * values cannot be mapped onto the new slugs without guessing, so any non-empty
 * legacy entry is dropped rather than misrepresented — the free-text detail is
 * still visible in the patient's audit history.
 */
export function normalizeTransportModes(value: unknown): TransportModeSlug[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((mode): mode is TransportModeSlug =>
    (TRANSPORT_MODE_SLUGS as readonly string[]).includes(mode),
  );
}
