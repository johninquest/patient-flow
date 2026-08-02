---
applyTo: "apps/api/src/modules/**"
description: "NestJS module conventions for Patient Flow API"
---

# API Module Instructions

## Module Structure

Every NestJS module follows this file layout:

```
modules/<name>/
  <name>.module.ts        # Module definition
  <name>.controller.ts    # Thin controller (HTTP concerns only)
  <name>.service.ts       # Business logic + DB queries
  dto/
    create-<name>.dto.ts  # Create DTO with class-validator
    update-<name>.dto.ts  # Update DTO (all fields optional)
```

## Controller Pattern

Controllers are thin — they handle HTTP concerns only (guards, decorators, params, body parsing). All business logic lives in services.

```typescript
@Controller('<resource>')
@UseGuards(AuthGuard)          // Always at class level
@ApiTags('<Resource>')         // Swagger tag
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get()
  @ApiOperation({ summary: 'List all resources' })
  findAll(@CurrentUser() user: any) {
    return this.resourceService.findAll(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get resource by ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourceService.findOne(id, user.id);
  }

  @Post()
  @ApiOperation({ summary: 'Create resource' })
  create(@Body() dto: CreateResourceDto, @CurrentUser() user: any) {
    return this.resourceService.create(dto, user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update resource' })
  update(@Param('id') id: string, @Body() dto: UpdateResourceDto, @CurrentUser() user: any) {
    return this.resourceService.update(id, dto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete resource' })
  remove(@Param('id') id: string, @CurrentUser() user: any) {
    return this.resourceService.remove(id, user.id);
  }
}
```

### Role-restricted endpoints

Use the `@Roles()` decorator + `RolesGuard` for endpoints that require specific roles:

```typescript
@Post()
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin', 'provider')
@ApiOperation({ summary: 'Create clinical note' })
create(@Body() dto: CreateNoteDto, @CurrentUser() user: any) {
  return this.service.create(dto, user.id);
}
```

**Note:** `AuthGuard` at class level handles authentication for all endpoints. `RolesGuard` is added per-method only where role restrictions apply.

## Service Pattern

Services contain all business logic and database queries. They use Drizzle ORM directly (no repository layer).

```typescript
@Injectable()
export class ResourceService {
  constructor(private readonly auditService: AuditService) {}

  async create(dto: CreateResourceDto, userId: string) {
    // 1. Validate business rules
    // 2. Insert into DB
    const [record] = await db.insert(table).values({ ... }).returning();
    // 3. Audit log
    await this.auditService.record({
      actor_user_id: userId,
      action: 'resource.created',
      resource_type: 'resource',
      resource_id: record.id,
    });
    return record;
  }

  async update(id: string, dto: UpdateResourceDto, userId: string) {
    // 1. Fetch existing record (throw NotFoundException if missing)
    const [existing] = await db.select().from(table).where(eq(table.id, id)).limit(1);
    if (!existing) throw new NotFoundException('Resource not found');
    // 2. Check permissions (role-based or attribute-based)
    // 3. Calculate diff for audit
    const diff = this.calculateDiff(existing, dto);
    // 4. Update
    const [updated] = await db.update(table).set({ ...dto, updated_at: new Date() }).where(eq(table.id, id)).returning();
    // 5. Audit log with diff
    if (diff) {
      await this.auditService.record({
        actor_user_id: userId,
        action: 'resource.updated',
        resource_type: 'resource',
        resource_id: id,
        diff,
      });
    }
    return updated;
  }

  async remove(id: string, userId: string) {
    // 1. Check permissions (admin only for deletes, or specific rules)
    // 2. Audit log BEFORE deleting
    await this.auditService.record({
      actor_user_id: userId,
      action: 'resource.deleted',
      resource_type: 'resource',
      resource_id: id,
    });
    // 3. Delete
    await db.delete(table).where(eq(table.id, id));
    return { success: true };
  }
}
```

### Key service rules
- Always inject `AuditService` and call `auditService.record()` on every mutation
- Use NestJS exceptions: `NotFoundException`, `ForbiddenException`, `BadRequestException`
- For updates: fetch existing record first, calculate diff, then update
- For deletes: audit log BEFORE the delete operation
- Never return raw DB errors to the client — let NestJS exception filters handle it

## DTO Pattern

### Create DTO — required fields marked, optional fields use `@IsOptional()`

```typescript
import { IsString, IsOptional, IsNotEmpty, IsDateString, IsEnum, IsBoolean } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsString()
  @IsNotEmpty()
  last_name: string;

  @IsDateString()
  @IsNotEmpty()
  date_of_birth: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  email?: string;
}
```

### Update DTO — all fields optional

```typescript
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdatePatientDto {
  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  @IsDateString()
  @IsOptional()
  date_of_birth?: string;

  @IsString()
  @IsOptional()
  phone?: string;
}
```

## Audit Logging

Every mutation endpoint must call `AuditService.record()`:

```typescript
await this.auditService.record({
  actor_user_id: userId,           // from @CurrentUser()
  actor_role: user.role,           // role at time of action
  action: 'patient.updated',       // dot-notation: entity.verb
  resource_type: 'patient',
  resource_id: id,
  diff: { first_name: { from: 'Old', to: 'New' } },  // optional, for updates
  ip_address: request.ip,          // optional, from request
});
```

### Action naming convention
- `patient.created`, `patient.updated`, `patient.deleted`
- `encounter.created`, `encounter.status_changed`, `encounter.assigned`
- `task.created`, `task.status_changed`, `task.assigned`, `task.completed`
- `user.role_changed`

### Read audit (sensitive endpoints)
For sensitive read operations (e.g., viewing patient records), log asynchronously:

```typescript
// Non-blocking — don't await
this.auditService.record({
  actor_user_id: userId,
  action: 'patient.viewed',
  resource_type: 'patient',
  resource_id: id,
}).catch(() => {}); // swallow errors on read audit
```

## Module Registration

Every new module must be registered in `apps/api/src/app.module.ts`:

```typescript
@Module({
  imports: [
    AuthModule,
    PatientsModule,
    EncountersModule,
    TasksModule,
    AuditModule,
    UserModule,
  ],
})
export class AppModule {}
```

## Swagger Decorators

Every endpoint must have Swagger documentation:

```typescript
@ApiTags('Patients')
@Controller('patients')
@UseGuards(AuthGuard)
export class PatientsController {

  @Get()
  @ApiOperation({ summary: 'List all patients' })
  @ApiResponse({ status: 200, description: 'List of patients' })
  findAll(@CurrentUser() user: any) { ... }

  @Post()
  @ApiOperation({ summary: 'Create a patient' })
  @ApiResponse({ status: 201, description: 'Patient created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  create(@Body() dto: CreatePatientDto, @CurrentUser() user: any) { ... }
}
```
