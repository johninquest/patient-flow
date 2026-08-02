---
name: scaffold-api-module
description: "Generate a complete NestJS module following Patient Flow conventions"
---

# Scaffold API Module

Generate a complete NestJS module for the Patient Flow API.

## Input

Ask me for:
1. **Module name** (e.g., `patients`, `encounters`, `tasks`)
2. **Entity fields** (name, type, required/optional)
3. **Which roles can access which endpoints**

## Output

Generate the following files:

### 1. `apps/api/src/modules/<name>/<name>.module.ts`
- Import and register controller, service
- Import AuditModule (for AuditService injection)
- Export service if other modules need it

### 2. `apps/api/src/modules/<name>/<name>.controller.ts`
Follow the thin controller pattern:
- `@Controller('<name>')` with `@UseGuards(AuthGuard)` at class level
- `@ApiTags('<Name>')` for Swagger
- `@CurrentUser()` on every method
- `@Roles()` + `RolesGuard` on role-restricted methods
- `@ApiOperation()` and `@ApiResponse()` on every method
- Delegate all logic to the service

### 3. `apps/api/src/modules/<name>/<name>.service.ts`
Follow the service pattern:
- `@Injectable()` with `AuditService` injected
- Full CRUD: `findAll`, `findOne`, `create`, `update`, `remove`
- Drizzle ORM queries (select, insert, update, delete)
- `NotFoundException` for missing records
- `ForbiddenException` for unauthorized access
- `AuditService.record()` on every mutation
- Diff calculation on updates
- Audit log BEFORE delete operations

### 4. `apps/api/src/modules/<name>/dto/create-<name>.dto.ts`
- class-validator decorators
- Required fields: `@IsNotEmpty()` + type decorator
- Optional fields: `@IsOptional()` + type decorator

### 5. `apps/api/src/modules/<name>/dto/update-<name>.dto.ts`
- All fields `@IsOptional()`
- Same type decorators as create DTO

### 6. Schema addition in `apps/api/src/core/db/schema.ts`
- Table with `uuid("id").primaryKey().default(sql\`uuidv7()\`)`
- `created_at` / `updated_at` timestamps
- Foreign keys with appropriate `onDelete` behavior
- Indexes on frequently queried columns

### 7. Register module in `apps/api/src/app.module.ts`

## Conventions Reference

- See `.github/instructions/api-module.instructions.md` for detailed patterns
- See `.github/instructions/drizzle-schema.instructions.md` for schema patterns
- All IDs: `uuidv7()`, never `gen_random_uuid()`
- Table names: snake_case, plural
- Action names: `<entity>.<verb>` (e.g., `patient.created`)
