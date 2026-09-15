import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { db } from '../../core/db/index.js';
import { user, session } from '../../core/db/schema.js';
import { eq, sql, desc } from 'drizzle-orm';
import { UpdateUserRoleDto } from './dto/update-user-role.dto.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserStatusDto } from './dto/update-user-status.dto.js';
import { ProfileResponseDto } from './dto/profile-response.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { getAuth } from '../../core/auth/auth.js';
import { translateDatabaseError } from '../../core/common/utils/database-error.util.js';

@Injectable()
export class UserService {
  constructor(private readonly auditService: AuditService) {}

  /**
   * List all users (excluding sensitive fields like password).
   */
  async findAll() {
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        title: user.title,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user);
  }

  /**
   * List users that can be assigned work (active accounts only).
   *
   * Deliberately separate from `findAll()` which is admin-only: any
   * authenticated user needs to populate "assign to" pickers. Returns only the
   * fields required to render a picker.
   */
  async findAssignable() {
    return db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
      })
      .from(user)
      .where(eq(user.status, 'active'))
      .orderBy(user.name);
  }

  /**
   * Get a single user by ID.
   */
  async findOne(id: string) {
    const [found] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        title: user.title,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, id))
      .limit(1);

    if (!found) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return found;
  }

  /**
   * Get the authenticated user's own profile, including last login
   * from the most recent session.
   */
  async findMe(userId: string): Promise<ProfileResponseDto> {
    const [found] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        image: user.image,
        role: user.role,
        title: user.title,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })
      .from(user)
      .where(eq(user.id, userId))
      .limit(1);

    if (!found) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Get the most recent session's updatedAt as "last login"
    const [lastSession] = await db
      .select({ updatedAt: session.updatedAt })
      .from(session)
      .where(eq(session.userId, userId))
      .orderBy(desc(session.updatedAt))
      .limit(1);

    return {
      ...found,
      lastLogin: lastSession?.updatedAt ?? null,
    };
  }

  /**
   * Create a new user account (admin only).
   *
   * Delegates to Better Auth's admin plugin, which creates the user row and the
   * linked `credential` account with a hashed password in a single transaction.
   * `role` and `title` travel in the same call because the plugin accepts
   * additional fields, so there is no follow-up write to keep in sync.
   *
   * `status` is deliberately not sent — the column default (`'active'`) applies.
   *
   * Note: `dto.role` reaches an auth API without plugin-side validation. That is
   * intentional: `createUserSchema` already constrains it to USER_ROLES, and the
   * plugin's role allow-list is only consulted when it is configured (we pass no
   * `roles`, since CASL owns authorization).
   */
  async createUser(dto: CreateUserDto, actorUserId: string, actorRole: string) {
    // Check if email already exists. Kept ahead of the auth call so a duplicate
    // returns 409 Conflict rather than the plugin's 400.
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, dto.email))
      .limit(1);

    if (existing) {
      throw new ConflictException(
        `A user with email ${dto.email} already exists`,
      );
    }

    const auth = getAuth();

    // `role` travels inside `data` rather than as the top-level `role` param.
    // The plugin types that param as its built-in vocabulary ("user" | "admin"),
    // which excludes ours, while `data` is an open additional-fields map. Both
    // are read through the same code path, and the plugin only validates against
    // a role allow-list when `roles` is configured — we configure none, because
    // CASL owns authorization. `createUserSchema` is the real validator.
    const created = await auth.api.createUser({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
        data: {
          role: dto.role,
          title: dto.title ?? null,
        },
      },
    });

    const userId = created.user.id;

    await this.auditService.record({
      actor_user_id: actorUserId,
      actor_role: actorRole,
      action: 'user.created',
      resource_type: 'user',
      resource_id: userId,
      diff: {
        name: { from: null, to: dto.name },
        email: { from: null, to: dto.email },
        role: { from: null, to: dto.role },
        title: { from: null, to: dto.title ?? null },
      },
    });

    // Re-read through `findOne` so the response has the exact shape the rest of
    // this service (and ProfileResponseDto) returns — notably `status`, which
    // the plugin's own user object does not include. This also avoids leaking
    // the plugin-managed ban columns to API clients.
    return this.findOne(userId);
  }

  /**
   * Update a user's status (active/suspended).
   * Prevents self-suspension and suspending the last admin.
   */
  async updateStatus(
    id: string,
    dto: UpdateUserStatusDto,
    actorUserId: string,
    actorRole: string,
  ) {
    const existing = await this.findOne(id);

    // Prevent self-suspension
    if (id === actorUserId && dto.status === 'suspended') {
      throw new ForbiddenException('You cannot suspend your own account');
    }

    // Prevent suspending the last admin
    if (
      dto.status === 'suspended' &&
      existing.role === 'admin' &&
      existing.status === 'active'
    ) {
      const activeAdminCount = await this.countActiveAdmins();
      if (activeAdminCount <= 1) {
        throw new ForbiddenException(
          'Cannot suspend the last active admin. Promote another user to admin first.',
        );
      }
    }

    const diff = this.auditService.calculateDiff(
      { status: existing.status },
      { status: dto.status },
      ['status'],
    );

    let updated;
    try {
      [updated] = await db
        .update(user)
        .set({
          status: dto.status,
          updatedAt: new Date(),
        })
        .where(eq(user.id, id))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          status: user.status,
          updatedAt: user.updatedAt,
        });
    } catch (error) {
      throw translateDatabaseError(error);
    }

    if (diff) {
      await this.auditService.record({
        actor_user_id: actorUserId,
        actor_role: actorRole,
        action: 'user.status_changed',
        resource_type: 'user',
        resource_id: id,
        diff,
      });
    }

    return updated;
  }

  /**
   * Update a user's role and/or title.
   * Prevents self-demotion from admin.
   */
  async updateRole(
    id: string,
    dto: UpdateUserRoleDto,
    actorUserId: string,
    actorRole: string,
  ) {
    const existing = await this.findOne(id);

    // Prevent self-demotion from admin
    if (id === actorUserId && dto.role && dto.role !== 'admin') {
      throw new ForbiddenException('You cannot demote yourself from admin');
    }

    // Prevent removing the last admin
    if (dto.role && dto.role !== 'admin' && existing.role === 'admin') {
      const adminCount = await this.countAdmins();
      if (adminCount <= 1) {
        throw new ForbiddenException(
          'Cannot demote the last admin. Promote another user to admin first.',
        );
      }
    }

    const diff = this.auditService.calculateDiff(existing, dto, [
      'role',
      'title',
    ]);

    let updated;
    try {
      [updated] = await db
        .update(user)
        .set({
          role: dto.role ?? existing.role,
          title: dto.title !== undefined ? dto.title : existing.title,
          updatedAt: new Date(),
        })
        .where(eq(user.id, id))
        .returning({
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          title: user.title,
          updatedAt: user.updatedAt,
        });
    } catch (error) {
      throw translateDatabaseError(error);
    }

    if (diff) {
      await this.auditService.record({
        actor_user_id: actorUserId,
        actor_role: actorRole,
        action: 'user.role_changed',
        resource_type: 'user',
        resource_id: id,
        diff,
      });
    }

    return updated;
  }

  /**
   * Count the number of admin users.
   */
  async countAdmins(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(eq(user.role, 'admin'));

    return result?.count ?? 0;
  }

  /**
   * Count the number of active admin users.
   */
  async countActiveAdmins(): Promise<number> {
    const [result] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(user)
      .where(sql`${user.role} = 'admin' AND ${user.status} = 'active'`);

    return result?.count ?? 0;
  }
}
