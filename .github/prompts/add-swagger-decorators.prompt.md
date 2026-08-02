---
name: add-swagger-decorators
description: "Audit controllers for missing Swagger decorators and add them"
---

# Add Swagger Decorators

Audit all NestJS controllers and add missing Swagger/OpenAPI decorators.

## Process

1. Find all controller files in `apps/api/src/modules/*/`
2. For each controller, check for:
   - `@ApiTags()` at class level
   - `@ApiOperation()` on every method
   - `@ApiResponse()` on every method (at least 200/201 success + relevant error codes)
   - `@ApiBearerAuth()` at class level (for authenticated endpoints)
3. Add any missing decorators

## Decorator Rules

### Class Level
```typescript
@ApiTags('Resource Name')        // Human-readable plural
@ApiBearerAuth()                  // If AuthGuard is used
@Controller('resource-name')
@UseGuards(AuthGuard)
```

### Method Level

**GET (list):**
```typescript
@ApiOperation({ summary: 'List all resources' })
@ApiResponse({ status: 200, description: 'List of resources' })
@ApiResponse({ status: 401, description: 'Unauthorized' })
```

**GET (detail):**
```typescript
@ApiOperation({ summary: 'Get resource by ID' })
@ApiResponse({ status: 200, description: 'Resource details' })
@ApiResponse({ status: 404, description: 'Resource not found' })
```

**POST:**
```typescript
@ApiOperation({ summary: 'Create a resource' })
@ApiResponse({ status: 201, description: 'Resource created' })
@ApiResponse({ status: 400, description: 'Validation error' })
```

**PUT:**
```typescript
@ApiOperation({ summary: 'Update a resource' })
@ApiResponse({ status: 200, description: 'Resource updated' })
@ApiResponse({ status: 404, description: 'Resource not found' })
```

**DELETE:**
```typescript
@ApiOperation({ summary: 'Delete a resource' })
@ApiResponse({ status: 200, description: 'Resource deleted' })
@ApiResponse({ status: 403, description: 'Forbidden' })
```

### Role-restricted endpoints
Add role info to the operation description:
```typescript
@ApiOperation({ summary: 'Delete a resource (admin only)' })
```

## Output

For each controller audited, report:
- Decorators already present ✅
- Decorators added 🔧
- Any issues found ⚠️
