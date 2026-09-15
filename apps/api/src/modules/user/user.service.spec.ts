import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException } from '@nestjs/common';
import type { AuditService } from '../audit/audit.service.js';

/**
 * `createUser` orchestrates two collaborators: Better Auth (which owns user +
 * credential-account creation) and the audit log. Both are mocked here so the
 * test asserts what this service is responsible for — the shape of the call it
 * makes and the shape of what it returns — without re-testing Better Auth.
 */

/** The one `auth.api.createUser` argument shape this service may produce. */
interface CreateUserArgs {
  body: {
    name: string;
    email: string;
    password: string;
    data: Record<string, unknown>;
  };
}

const mocks = vi.hoisted(() => ({
  /** Canned results for successive `db.select(...).limit()` calls. */
  selectQueue: [] as unknown[][],
  select: vi.fn(),
  authCreateUser:
    vi.fn<(args: CreateUserArgs) => Promise<{ user: { id: string } }>>(),
  auditRecord: vi.fn(),
}));

/** Minimal chainable stand-in for Drizzle's select builder. */
function makeSelectChain() {
  const chain: Record<string, unknown> = {};
  chain.from = vi.fn(() => chain);
  chain.where = vi.fn(() => chain);
  chain.orderBy = vi.fn(() => chain);
  chain.limit = vi.fn(() => Promise.resolve(mocks.selectQueue.shift() ?? []));
  return chain;
}

vi.mock('../../core/db/index.js', () => ({
  db: { select: mocks.select },
}));

vi.mock('../../core/auth/auth.js', () => ({
  getAuth: () => ({ api: { createUser: mocks.authCreateUser } }),
}));

const { UserService } = await import('./user.service.js');

type UserServiceType = InstanceType<typeof UserService>;

const DTO = {
  name: 'Joel Doc',
  email: 'joel.doc@mail.cm',
  password: 'password1',
  role: 'clinical_staff' as const,
  title: 'Doctor',
};

/** Row shape `findOne()` projects. */
const PERSISTED = {
  id: 'user-1',
  name: DTO.name,
  email: DTO.email,
  emailVerified: false,
  image: null,
  role: DTO.role,
  title: DTO.title,
  status: 'active',
  createdAt: new Date('2026-09-15T10:00:00Z'),
  updatedAt: new Date('2026-09-15T10:00:00Z'),
};

function makeService(): UserServiceType {
  const auditService = {
    record: mocks.auditRecord,
  } as unknown as AuditService;

  return new UserService(auditService);
}

describe('UserService.createUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.selectQueue.length = 0;
    mocks.select.mockImplementation(makeSelectChain);
    mocks.authCreateUser.mockResolvedValue({ user: { id: PERSISTED.id } });
  });

  it('provisions the user in a single Better Auth call including role and title', async () => {
    mocks.selectQueue.push([], [PERSISTED]);

    const result = await makeService().createUser(DTO, 'admin-1', 'admin');

    expect(mocks.authCreateUser).toHaveBeenCalledTimes(1);
    expect(mocks.authCreateUser).toHaveBeenCalledWith({
      body: {
        name: DTO.name,
        email: DTO.email,
        password: DTO.password,
        data: {
          role: DTO.role,
          title: DTO.title,
        },
      },
    });

    expect(result).toEqual(PERSISTED);
  });

  it('forwards an omitted title as null rather than dropping the key', async () => {
    mocks.selectQueue.push([], [PERSISTED]);

    await makeService().createUser(
      { ...DTO, title: undefined },
      'admin-1',
      'admin',
    );

    const [{ body }] = mocks.authCreateUser.mock.calls[0];
    expect(body.data).toEqual({ role: DTO.role, title: null });
  });

  it('rejects a duplicate email with 409 and never calls Better Auth', async () => {
    mocks.selectQueue.push([{ id: 'existing-user' }]);

    await expect(
      makeService().createUser(DTO, 'admin-1', 'admin'),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(mocks.authCreateUser).not.toHaveBeenCalled();
    expect(mocks.auditRecord).not.toHaveBeenCalled();
  });

  it('records one audit entry describing the created fields', async () => {
    mocks.selectQueue.push([], [PERSISTED]);

    await makeService().createUser(DTO, 'admin-1', 'admin');

    expect(mocks.auditRecord).toHaveBeenCalledTimes(1);
    expect(mocks.auditRecord).toHaveBeenCalledWith({
      actor_user_id: 'admin-1',
      actor_role: 'admin',
      action: 'user.created',
      resource_type: 'user',
      resource_id: PERSISTED.id,
      diff: {
        name: { from: null, to: DTO.name },
        email: { from: null, to: DTO.email },
        role: { from: null, to: DTO.role },
        title: { from: null, to: DTO.title },
      },
    });
  });

  it('returns the persisted row so the response includes status', async () => {
    mocks.selectQueue.push([], [PERSISTED]);

    const result = await makeService().createUser(DTO, 'admin-1', 'admin');

    // The plugin's own user object has no `status`; re-reading through findOne
    // is what keeps the response aligned with ProfileResponseDto.
    expect(result.status).toBe('active');
  });
});
