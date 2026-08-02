# Check Contract Drift

Compare the static contract files against the live codebase and report any drift.

## Instructions

You are checking for **contract drift** — discrepancies between the documented contracts and the actual code. This is a read-only audit. Do NOT modify any files.

### Step 1: Read the Contracts
- Read `docs/contracts/api_spec.md`
- Read `docs/contracts/schema.md`

### Step 2: Read the Live Code
- Read `apps/api/src/core/db/schema.ts` — compare every table, column, type, constraint, and index against `schema.md`
- Read ALL controller files in `apps/api/src/modules/*/` — compare every route, method, guard, and role against `api_spec.md`
- Read ALL DTO files in `apps/api/src/modules/*/dto/` — compare every field and validation decorator against `api_spec.md`

### Step 3: Produce a Drift Report

Output the following format:

```
# Contract Drift Report
Generated: [date]

## Schema Drift (schema.md vs schema.ts)

### Tables
| Table | Status | Notes |
|-------|--------|-------|
| patients | ✅ Match | |
| encounters | ⚠️ Drift | Missing column: `new_column` |
| ... | ... | ... |

### Columns
| Table | Column | Contract Says | Code Says | Action |
|-------|--------|--------------|-----------|--------|
| ... | ... | ... | ... | Update contract / Update code |

### Indexes
| Table | Index | Contract | Code | Action |
|-------|--------|----------|------|--------|
| ... | ... | ... | ... | ... |

## API Drift (api_spec.md vs controllers/DTOs)

### Endpoints
| Method | Path | Contract | Code | Action |
|--------|------|----------|------|--------|
| POST | /api/patients | ✅ Match | | |
| ... | ... | ... | ... | ... |

### DTO Fields
| DTO | Field | Contract | Code | Action |
|-----|-------|----------|------|--------|
| ... | ... | ... | ... | ... |

## Summary
- Tables matched: X/Y
- Endpoints matched: X/Y
- DTOs matched: X/Y
- **Drift items: N**

## Recommended Actions
1. [Update contract to match code] or [Update code to match contract] for each drift item
```

### Rules
- If the code has something the contract doesn't → drift (code added without updating contract)
- If the contract has something the code doesn't → drift (contract not implemented yet)
- If types or constraints differ → drift
- If roles/guards differ → drift
- Report ONLY differences. Do not list matches (use the summary count instead).
