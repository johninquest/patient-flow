# Access Control Plan (lean, Google-first)

Goal: Google-only auth; new users have no access by default; superuser bootstraps first manager; managers can grant manager/viewer/none by Gmail (no email invites for MVP).

## Assumptions
- PocketBase with Google OAuth enabled.
- Collections implemented: properties, tenants, units, rent_entries, user_access, audit_logs.
- No email/notification system for MVP.

## Roles
- superuser: single admin (you) — can create initial user_access entries.
- owner: property.owner (landlord) — full rights on their properties.
- manager: can view/edit property/tenant/rent_entries for delegated property.
- viewer: read-only for delegated property.
- none/blocked: no access (delete or set role to none).

## Data model (user_access)
- user → users (relation, single)
- property → properties (relation, single)
- role → select {manager, viewer}
- granted_by → users (relation, single)
- created_at → datetime (autodate)

## High-level flows
1. Signup/Login
   - Any user can sign in with Google.
   - New users have no user_access entries → no visibility.

2. Bootstrap
   - Use Admin UI to add first user_access entries (superuser grants manager to user(s)).

3. Granting access (manager UX)
   - Manager enters Gmail.
   - UI checks if user exists:
     - If exists: create user_access with role.
     - If not: instruct user to sign up with Google; optionally store a pending invite record for future automation.
   - Managers can update/remove user_access for properties they manage.

4. On access change
   - Create audit_logs entries (hook) for create/update/delete of user_access and other collections.

## Security rules (summary)
- For sensitive collections (properties, tenants, rent_entries, units):
  - owner = @request.auth.id OR
  - exists(user_access where user = @request.auth.id AND property = property_id AND role in [manager, viewer]) — and for write ops require role = manager or owner.
- user_access create/update/delete:
  - Create: only owner or manager (depending on policy) — for MVP: only owner (or superuser) can CREATE; managers can create for properties they manage (if owner allowed delegation).
  - Update/Delete: allowed by granted_by (owner) or by managers who created the entry.
- audit_logs: API create/update/delete = null (only hooks can write).

## Implementation suggestions (MVP)
- Keep role set small: manager, viewer.
- No notification: managers must tell delegates to sign in with Google; add UI hint "User must sign in with Google first."
- Store pending invites (optional) as simple records: email, property, role, created_by.
- Implement hooks:
  - On create/update/delete of relevant collections => append audit_logs record with entity_type, entity_id, action, changes, user.
  - On user_access create: if user exists, grant immediately; if not, mark pending.
- Frontend:
  - Grant-access modal: input email, check existence, show existence state, allow create user_access or save pending invite.
  - Permission check helpers that query user_access for current user + property.

## Upgrade path
- Add email invites & templated invites.
- Self-service access requests + approval workflow.
- More granular roles/permissions.
- Automate pending invites: when user signs up, convert pending invite → user_access and notify.

## Next steps (concrete)
1. Implement and import rules in PocketBase for collections above.
2. Add hooks for audit_logs + pending-invite handling.
3. Create frontend grant-access modal with email existence check and pending-invite fallback.
