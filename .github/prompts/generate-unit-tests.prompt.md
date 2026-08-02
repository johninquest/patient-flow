---
name: generate-unit-tests
description: "Generate unit tests for a NestJS service following Patient Flow conventions"
---

# Generate Unit Tests

Generate comprehensive unit tests for a NestJS service in the Patient Flow API.

## Input

Ask me for:
1. **Service file path** (e.g., `apps/api/src/modules/patients/patients.service.ts`)

## Process

1. Read the service file to understand all methods and their logic
2. Read the DTOs used by the service
3. Read the schema tables the service queries
4. Identify all dependencies to mock (AuditService, db queries)

## Output

Generate `apps/api/src/modules/<name>/<name>.service.spec.ts` with:

### Test Structure
- Use `@nestjs/testing` `Test.createTestingModule()`
- Mock `AuditService` with `jest.fn()` for all methods
- Mock Drizzle `db` queries (chain-style: `db.select().from().where().limit()`)

### Test Cases Per Method

**For `create()`:**
- Should create a record with valid data
- Should call AuditService.record() with correct action
- Should throw on validation failure

**For `findAll()`:**
- Should return all records for the user
- Should return empty array when no records exist

**For `findOne()`:**
- Should return the record when found
- Should throw NotFoundException when not found

**For `update()`:**
- Should update and return the record
- Should throw NotFoundException when record doesn't exist
- Should throw ForbiddenException when user lacks permission
- Should call AuditService.record() with diff when changes exist
- Should NOT call AuditService.record() when no changes

**For `remove()`:**
- Should delete the record
- Should throw ForbiddenException when user lacks permission
- Should call AuditService.record() BEFORE deleting

### Mocking Pattern

```typescript
const mockAuditService = {
  record: jest.fn().mockResolvedValue(undefined),
  calculateDiff: jest.fn(),
};

const mockDb = {
  select: jest.fn().mockReturnThis(),
  from: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  limit: jest.fn().mockResolvedValue([mockRecord]),
  insert: jest.fn().mockReturnThis(),
  values: jest.fn().mockReturnThis(),
  returning: jest.fn().mockResolvedValue([mockRecord]),
  update: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
};
```

## Conventions

- Test file name: `<name>.service.spec.ts` (co-located with service)
- Use `describe` blocks per method
- Use `beforeEach` to reset mocks
- Run with `npm test` from `apps/api/` directory
