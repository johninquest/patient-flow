# Audit Logs & Traceability

## Overview
Every change in Lanlod is tracked to provide transparency, accountability, and dispute resolution. Audit logs are immutable and cannot be edited or deleted by users.

## What Gets Tracked

### Critical Events
All Create, Update, Delete operations on:
- **Tenants**: New tenant added, information changed, tenant removed
- **Units**: Unit created, details modified, unit deleted
- **Rent Entries**: Payment recorded, amount corrected, entry deleted
- **Expenses**: Expense logged, details changed, expense removed
- **Properties**: Property created, information updated, property archived
- **Access Control**: User granted access, role changed, access revoked

### Information Captured
For each event:
- **Who**: User who made the change (name, email)
- **What**: Type of action (created, updated, deleted)
- **When**: Precise timestamp
- **Where**: Which property was affected
- **Details**: Before/after values for updates

## Three Levels of Visibility

### Level 1: Inline Attribution
**Always visible on every entry**

Every rent payment, expense, tenant record shows:
- Who created it
- When it was created
- Who last modified it (if applicable)
- When it was last modified

**Purpose**: Quick context without opening separate logs

**Example Display:**
```
Rent Payment: $1,500
Tenant: John Doe, Unit 2A
Recorded by Sarah Martinez • 2 hours ago
Last edited by Tom Wilson • 30 minutes ago
```

### Level 2: Property Activity Feed
**Per-property timeline view**

Accessible via "Activity" tab on each property page.

Shows chronological list of all changes to that property:
- All tenant changes
- All rent entries
- All expenses logged
- All access control changes
- All property detail updates

**Filtering Options:**
- By user (see what Sarah did)
- By action type (only rent entries)
- By date range (last week, last month, custom)

**Purpose**: Answer questions like:
- "What changed since I last checked?"
- "What did Maria do last week?"
- "When was this tenant added?"

**Example Display:**
```
Today
• Tom Wilson edited rent payment for Unit 2A
  Changed amount from $1,450 to $1,500
  2 hours ago

• Sarah Martinez added new expense
  "Plumbing repair - $340"
  5 hours ago

Yesterday
• Maria Garcia added new tenant
  "Jane Smith - Unit 3B"
  
• John Smith (owner) granted manager access
  to Tom Wilson
```

### Level 3: System-Wide Audit Log
**Cross-property view for property owners**

Accessible from Account Settings or Dashboard.

Shows all activity across all properties the user owns.

**Advanced Filtering:**
- Select specific properties or "all properties"
- Filter by team member
- Filter by action type
- Custom date ranges
- Export to CSV/PDF

**Purpose**: 
- Monthly review of all team activity
- Audit for tax purposes
- Accountability across portfolio

**Access Control:**
- Property owners see logs for properties they own
- Managers see logs for properties they manage
- Viewers can see activity feed (read-only)

## User Experience Principles

### Transparency Without Paranoia
- Frame as "activity history" not "surveillance"
- Helpful collaboration tool, not a gotcha mechanism
- Make it feel like version history, not spy logs

### Contextual Relevance
- Most users see Level 1 (inline) only
- Power users explore Level 2 (property feed)
- Owners use Level 3 (system-wide) for overview

### Cannot Be Tampered
- Users cannot edit or delete audit logs
- Even property owners cannot modify history
- Provides trustworthy dispute resolution

### Performance Consideration
- Logs stored efficiently (don't slow down app)
- Archived logs (older than X years) moved to cold storage
- Quick searches on recent activity

## Common Use Cases

### Accountability
*"Who changed the rent amount for Unit 2A?"*
- Check property activity feed
- See: Tom Wilson edited amount 2 hours ago

### Compliance
*"Show me all rent payments recorded in December"*
- Use system-wide audit log
- Filter by action type: rent entries
- Filter by date: December 2024
- Export to CSV for accountant

### Dispute Resolution
*"Sarah says she logged this expense last week, but I don't see it"*
- Check property activity feed for that property
- Search for Sarah's actions last week
- See what she actually recorded

### Team Management
*"How active is Tom on the properties I shared with him?"*
- System-wide audit log
- Filter by user: Tom Wilson
- See frequency and types of actions

### Error Recovery
*"Someone deleted the wrong tenant record"*
- Property activity feed shows who deleted it and when
- Can see deleted tenant's information (for recreation)
- Owner can discuss with team member

## Privacy & Security

### Who Sees What
- **Property Owners**: See all logs for their properties
- **Managers**: See activity feed for properties they manage
- **Viewers**: See activity feed (read-only) for properties they view
- **Admins** (you): See system-wide logs for support/debugging

### Data Retention
- Keep logs indefinitely for active properties
- Archive logs when property is deleted (retain for X years)
- Comply with data privacy regulations (GDPR, etc.)

### Sensitive Information
- Don't log payment method details (credit card numbers)
- Don't log full document contents (just "document updated")
- Log sufficient detail for accountability, not surveillance

## Future Enhancements (Post-MVP)
- Real-time activity notifications ("Tom just updated rent for Unit 2A")
- Rollback functionality (undo changes with one click)
- Advanced analytics (team productivity, most active properties)
- Integration with external accounting software audit trails
- Automated monthly activity reports sent to owners