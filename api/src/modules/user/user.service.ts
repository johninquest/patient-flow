import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { db } from '../../core/db';
import { user, session } from '../../core/db/schema';
import { eq, sql, desc } from 'drizzle-orm';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { AuditService } from '../audit/audit.service';
import { getAuth } from '../../core/auth/auth';

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
   * Uses Better Auth's server-side API to create the user + account,
   * then updates the user record with role, title, and status.
   */
  async createUser(dto: CreateUserDto, actorUserId: string, actorRole: string) {
    // Check if email already exists
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

    // Create user via Better Auth server-side API
    const created = await auth.api.createUser({
      body: {
        name: dto.name,
        email: dto.email,
        password: dto.password,
      },
    });

    const userId = created.user.id;

    // Update with role, title, and status
    const [updated] = await db
      .update(user)
      .set({
        role: dto.role,
        title: dto.title ?? null,
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId))
      .returning({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        title: user.title,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      });

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

    return updated;
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

    const [updated] = await db
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

    const [updated] = await db
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
