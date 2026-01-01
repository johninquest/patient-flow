# Access Control System

## Overview
Lanlod uses a simple, Google Docs-style sharing model where property owners can grant Manager or Viewer access to their properties via email.

## Why This Approach?

**Decision Context:**
We evaluated three alternative approaches (Email-First, Property Team Management, and Access Codes) and chose Email-First sharing because:

1. **Familiar Mental Model**: Users already understand "share via email" from Google Docs, Notion, and other collaborative tools - zero learning curve
2. **Simplicity for MVP**: No invitation system, no pending states, no complex team management - just share and go
3. **Scales Naturally**: Works for solo landlords (1 property) and growing portfolios (10+ properties) without additional complexity
4. **Developer-Friendly**: Straightforward to implement and maintain compared to team hierarchy systems or access code infrastructure
5. **Secure by Default**: Email-based sharing is more secure than shareable codes while remaining simple
6. **Future-Proof**: Easy to add team management features later without breaking existing sharing workflow

**What We Intentionally Left Out (for now):**
- Email notifications (owner tells people manually)
- Self-service access requests
- Team/organization concepts
- Access expiration dates
- Granular permissions beyond Manager/Viewer

These can be added post-MVP without disrupting the core experience.

## Core Principles

### Identity Model
- **Every Google sign-in = Potential Property Owner**: Anyone who authenticates can create their own properties
- **Access is Property-Specific**: Users can own some properties while having Manager/Viewer access to others
- **Separation of Concerns**: Ownership and delegated access are independent

### User Roles

**Owner** (Property Level)
- The person who created the property
- Full control over property data
- Can share property with others
- Cannot transfer ownership (MVP)

**Manager** (Delegated Access)
- Can view and edit all property data
- Can manage tenants, units, rent entries, expenses
- Cannot share property with others (owner-only action)
- Cannot delete the property

**Viewer** (Delegated Access)
- Read-only access to all property data
- Can view tenants, units, rent entries, expenses, reports
- Cannot modify anything

## Sharing Workflow

### Owner Experience
1. Navigate to any property they own
2. Click "Share" button (always visible, top-right area)
3. Simple modal appears: "Who can access this property?"
4. Enter email address(es) - must be Gmail
5. Select role: Manager or Viewer
6. Click "Share"

**What Happens:**
- System checks if user with that email exists
- If exists: Access granted immediately
- If doesn't exist: Access queued for when they sign in with that Gmail
- No email notifications sent (MVP - owner tells them separately)

### Manager/Viewer Experience
1. Sign in with Google
2. Dashboard shows two sections:
   - **My Properties**: Properties they own
   - **Shared With Me**: Properties where they have Manager/Viewer access
3. Each shared property shows:
   - Property name and details
   - Their access level (Manager/Viewer badge)
   - Who shared it with them ("Shared by John Smith")

### Revoking Access
- Owner sees list of people with access on property details
- Click "×" or "Remove" next to any person
- Access revoked immediately
- User no longer sees that property in their dashboard

## Authorization Rules

### Reading Data
User can view property if:
- They own the property, OR
- They have Manager access to the property, OR
- They have Viewer access to the property

### Writing Data
User can modify property if:
- They own the property, OR
- They have Manager access to the property

Viewers cannot modify anything.

### Sharing Properties
Only property owners can grant/revoke access.
Managers and Viewers cannot share properties.

## Dashboard Organization

**Visual Hierarchy:**
```
MY PROPERTIES (count)
- Property 1
- Property 2
[+ Add Property] button

─────────────────────

SHARED WITH ME (count)
- Property 3 (Manager • Shared by John)
- Property 4 (Viewer • Shared by Sarah)
```

**Key Visual Elements:**
- Clear separation between owned and shared properties
- Badges showing access level (Manager/Viewer)
- Attribution showing who granted access
- "Add Property" button only in owned section

## Edge Cases

### User Doesn't Exist Yet
- Owner enters email and shares
- System stores pending access
- When user signs in with that Gmail for first time → property appears in their "Shared With Me"
- Owner sees "Pending" indicator next to that person's email

### Multi-Role Users
- Sarah owns her own properties AND manages properties for clients
- Both sections appear on her dashboard
- Access controls are property-specific, not account-level
- She can seamlessly switch between her properties and client properties

### Same Person, Multiple Properties
- Owner can share multiple properties with same person in one action
- Bulk sharing: "Give Maria Manager access to all 5 properties?"
- Each property maintains independent access (can revoke individually)

## Future Enhancements (Post-MVP)
- Email notifications when access is granted
- Self-service access requests (user requests, owner approves)
- Time-limited access (expires after X days)
- Access codes for temporary/contractor access
- Team management (define team once, assign to multiple properties)
- Ownership transfer