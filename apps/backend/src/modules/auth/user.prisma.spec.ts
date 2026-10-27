import { User } from '@rochas-surf-school/auth';
import { Prisma } from '../../generated/prisma/client.js';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaUserRepository } from './user.prisma.js';

const ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const CREATED_AT = new Date('2026-10-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-10-02T00:00:00.000Z');

const minimalRecord = {
  id: ID,
  name: 'Ana Rocha',
  email: 'ana@example.com',
  photoUrl: null,
  whatsappNumber: null,
  whatsappVisible: false,
  role: 'student',
  status: 'pending',
  denialReason: null,
  deniedAt: null,
  removedAt: null,
  reactivationStatus: null,
  reactivationRequestedAt: null,
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  deletedAt: null,
  rulesAcceptances: [],
};

const fullRecord = {
  ...minimalRecord,
  photoUrl: 'https://cdn.example.com/ana.jpg',
  whatsappNumber: '+5585999998888',
  whatsappVisible: true,
  role: 'admin',
  status: 'deleted',
  denialReason: 'Unknown person',
  deniedAt: new Date('2026-10-03T00:00:00.000Z'),
  removedAt: new Date('2026-10-04T00:00:00.000Z'),
  reactivationStatus: 'requested',
  reactivationRequestedAt: new Date('2026-10-06T00:00:00.000Z'),
  deletedAt: new Date('2026-10-05T00:00:00.000Z'),
  rulesAcceptances: [
    { userId: ID, version: 1, acceptedAt: new Date('2026-10-02T10:00:00.000Z') },
  ],
};

function setup() {
  const user = {
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  };
  const $queryRaw = vi.fn();
  const userRulesAcceptance = { createMany: vi.fn() };
  const tx = { user, $queryRaw };
  const $transaction = vi.fn(async (callback: (client: typeof tx) => unknown) => callback(tx));
  const repository = new PrismaUserRepository({
    user,
    userRulesAcceptance,
    $queryRaw,
    $transaction,
  } as unknown as PrismaService);
  return { user, userRulesAcceptance, $queryRaw, $transaction, repository };
}

function minimalUser(): User {
  return new User({
    id: ID,
    name: 'Ana Rocha',
    email: 'ana@example.com',
    whatsappVisible: false,
    role: 'student',
    status: 'pending',
    createdAt: CREATED_AT,
  });
}

function fullUser(): User {
  return new User({
    id: ID,
    name: 'Ana Rocha',
    email: 'ana@example.com',
    photoUrl: fullRecord.photoUrl,
    whatsappNumber: fullRecord.whatsappNumber,
    whatsappVisible: true,
    role: 'admin',
    status: 'deleted',
    denialReason: fullRecord.denialReason,
    deniedAt: fullRecord.deniedAt,
    removedAt: fullRecord.removedAt,
    reactivationStatus: 'requested',
    reactivationRequestedAt: fullRecord.reactivationRequestedAt,
    rulesAcceptances: [{ version: 1, acceptedAt: fullRecord.rulesAcceptances[0]!.acceptedAt }],
    createdAt: CREATED_AT,
    deletedAt: fullRecord.deletedAt,
  });
}

describe('PrismaUserRepository', () => {
  it('creates a user with its rules acceptances and maps the record back', async () => {
    const { user, repository } = setup();
    user.create.mockResolvedValue(fullRecord);

    const created = await repository.create(fullUser());

    expect(user.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        name: 'Ana Rocha',
        email: 'ana@example.com',
        photoUrl: fullRecord.photoUrl,
        whatsappNumber: fullRecord.whatsappNumber,
        whatsappVisible: true,
        role: 'admin',
        status: 'deleted',
        denialReason: 'Unknown person',
        deniedAt: fullRecord.deniedAt,
        removedAt: fullRecord.removedAt,
        reactivationStatus: 'requested',
        reactivationRequestedAt: fullRecord.reactivationRequestedAt,
        deletedAt: fullRecord.deletedAt,
        createdAt: CREATED_AT,
        rulesAcceptances: {
          create: [{ version: 1, acceptedAt: fullRecord.rulesAcceptances[0]!.acceptedAt }],
        },
      },
      include: { rulesAcceptances: true },
    });
    expect(created).toBeInstanceOf(User);
    expect(created.id).toBe(ID);
    expect(created.photoUrl).toBe(fullRecord.photoUrl);
    expect(created.whatsappNumber).toBe(fullRecord.whatsappNumber);
    expect(created.role).toBe('admin');
    expect(created.status).toBe('deleted');
    expect(created.denialReason).toBe('Unknown person');
    expect(created.deniedAt).toEqual(fullRecord.deniedAt);
    expect(created.removedAt).toEqual(fullRecord.removedAt);
    expect(created.reactivationStatus).toBe('requested');
    expect(created.reactivationRequestedAt).toEqual(fullRecord.reactivationRequestedAt);
    expect(created.rulesAcceptances).toEqual([
      { version: 1, acceptedAt: fullRecord.rulesAcceptances[0]!.acceptedAt },
    ]);
    expect(created.updatedAt).toEqual(UPDATED_AT);
    expect(created.deletedAt).toEqual(fullRecord.deletedAt);
  });

  it('writes nulls for the optional fields a user does not have', async () => {
    const { user, repository } = setup();
    user.create.mockResolvedValue(minimalRecord);

    const created = await repository.create(minimalUser());

    expect(user.create.mock.calls[0]![0].data).toMatchObject({
      photoUrl: null,
      whatsappNumber: null,
      denialReason: null,
      deniedAt: null,
      removedAt: null,
      reactivationStatus: null,
      reactivationRequestedAt: null,
      deletedAt: null,
      rulesAcceptances: { create: [] },
    });
    expect(created.photoUrl).toBeUndefined();
    expect(created.whatsappNumber).toBeUndefined();
    expect(created.denialReason).toBeUndefined();
    expect(created.deniedAt).toBeUndefined();
    expect(created.removedAt).toBeUndefined();
    expect(created.reactivationStatus).toBeUndefined();
    expect(created.reactivationRequestedAt).toBeUndefined();
    expect(created.rulesAcceptances).toEqual([]);
    expect(created.deletedAt).toBeNull();
  });

  it('updates the user and replaces its rules acceptances', async () => {
    const { user, repository } = setup();
    user.update.mockResolvedValue(fullRecord);

    const updated = await repository.update(fullUser());

    const call = user.update.mock.calls[0]![0];
    expect(call.where).toEqual({ id: ID });
    expect(call.data.rulesAcceptances).toEqual({
      deleteMany: {},
      create: [{ version: 1, acceptedAt: fullRecord.rulesAcceptances[0]!.acceptedAt }],
    });
    expect(call.data).not.toHaveProperty('id');
    expect(call.include).toEqual({ rulesAcceptances: true });
    expect(updated.id).toBe(ID);
  });

  it('deletes by id', async () => {
    const { user, repository } = setup();
    user.delete.mockResolvedValue(minimalRecord);

    await repository.delete(ID);

    expect(user.delete).toHaveBeenCalledWith({ where: { id: ID } });
  });

  it('finds by id', async () => {
    const { user, repository } = setup();
    user.findUnique.mockResolvedValueOnce(minimalRecord).mockResolvedValueOnce(null);

    expect((await repository.findById(ID))?.email).toBe('ana@example.com');
    await expect(repository.findById(ID)).resolves.toBeNull();
    expect(user.findUnique).toHaveBeenCalledWith({
      where: { id: ID },
      include: { rulesAcceptances: true },
    });
  });

  it('finds by email', async () => {
    const { user, repository } = setup();
    user.findUnique.mockResolvedValueOnce(minimalRecord).mockResolvedValueOnce(null);

    expect((await repository.findByEmail('ana@example.com'))?.id).toBe(ID);
    await expect(repository.findByEmail('bia@example.com')).resolves.toBeNull();
    expect(user.findUnique).toHaveBeenNthCalledWith(1, {
      where: { email: 'ana@example.com' },
      include: { rulesAcceptances: true },
    });
  });

  it('returns a page with the total', async () => {
    const { user, repository } = setup();
    user.findMany.mockResolvedValue([minimalRecord]);
    user.count.mockResolvedValue(11);

    const page = await repository.findPage({ page: 2, perPage: 10 });

    expect(user.findMany).toHaveBeenCalledWith({
      skip: 10,
      take: 10,
      orderBy: { createdAt: 'asc' },
      include: { rulesAcceptances: true },
    });
    expect(page.items.map((item) => item.id)).toEqual([ID]);
    expect(page).toMatchObject({ page: 2, perPage: 10, total: 11 });
  });

  it('searches by name, trimmed and case-insensitive', async () => {
    const { user, repository } = setup();
    user.findMany.mockResolvedValue([minimalRecord]);

    const users = await repository.searchByName('  ana ');

    expect(user.findMany).toHaveBeenCalledWith({
      where: { name: { contains: 'ana', mode: 'insensitive' } },
      orderBy: { name: 'asc' },
      include: { rulesAcceptances: true },
    });
    expect(users.map((item) => item.id)).toEqual([ID]);
  });

  it('finds the pending users, oldest first', async () => {
    const { user, repository } = setup();
    user.findMany.mockResolvedValue([minimalRecord]);

    const users = await repository.findPending();

    expect(user.findMany).toHaveBeenCalledWith({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      include: { rulesAcceptances: true },
    });
    expect(users.map((item) => item.id)).toEqual([ID]);
  });

  describe('findDirectoryPage', () => {
    const OTHER_ID = '1c9f5a3e-77b0-4f0e-8d3a-5b6c7d8e9f01';

    /** The SQL text and bound values of the nth raw query, as Postgres would receive them. */
    function sqlOf($queryRaw: ReturnType<typeof vi.fn>, call: number) {
      const [strings, ...values] = $queryRaw.mock.calls[call] as [
        TemplateStringsArray,
        ...unknown[],
      ];
      const query = Prisma.sql(strings, ...values);
      return { text: query.sql.replace(/\s+/g, ' ').trim(), values: query.values };
    }

    it('lists approved users in the query order, mapped to the domain, with the total', async () => {
      const { user, $queryRaw, repository } = setup();
      $queryRaw
        .mockResolvedValueOnce([{ id: OTHER_ID }, { id: ID }])
        .mockResolvedValueOnce([{ total: 25n }]);
      user.findMany.mockResolvedValue([minimalRecord, { ...minimalRecord, id: OTHER_ID }]);

      const result = await repository.findDirectoryPage({ page: 2, perPage: 20 });

      expect(result.items.map((item) => item.id)).toEqual([OTHER_ID, ID]);
      expect(result).toMatchObject({ page: 2, perPage: 20, total: 25 });
      expect(user.findMany).toHaveBeenCalledWith({
        where: { id: { in: [OTHER_ID, ID] } },
        include: { rulesAcceptances: true },
      });
      expect(sqlOf($queryRaw, 0)).toEqual({
        text: "SELECT id FROM users WHERE status = 'approved' ORDER BY lower(unaccent(name)) ASC, id ASC LIMIT ? OFFSET ?",
        values: [20, 20],
      });
      expect(sqlOf($queryRaw, 1).text).toBe(
        "SELECT COUNT(*) AS total FROM users WHERE status = 'approved'",
      );
    });

    it('filters by roles and by name ignoring accents, escaping LIKE wildcards', async () => {
      const { $queryRaw, repository } = setup();
      $queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 0n }]);

      await repository.findDirectoryPage({
        page: 1,
        perPage: 20,
        roles: ['instructor', 'admin'],
        search: '50%_a\\b',
      });

      const select = sqlOf($queryRaw, 0);
      expect(select.text).toContain(
        "status = 'approved' AND role = ANY(?::user_role[]) AND unaccent(lower(name)) LIKE unaccent(lower(?))",
      );
      expect(select.values.slice(0, 2)).toEqual([['instructor', 'admin'], '%50\\%\\_a\\\\b%']);
      expect(sqlOf($queryRaw, 1).values).toEqual([['instructor', 'admin'], '%50\\%\\_a\\\\b%']);
    });

    it('skips the user query for an empty page', async () => {
      const { user, $queryRaw, repository } = setup();
      $queryRaw.mockResolvedValueOnce([]).mockResolvedValueOnce([{ total: 3n }]);

      const result = await repository.findDirectoryPage({ page: 5, perPage: 20 });

      expect(result).toEqual({ items: [], page: 5, perPage: 20, total: 3 });
      expect(sqlOf($queryRaw, 0).values).toEqual([20, 80]);
      expect(user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('updateIfPending', () => {
    it('writes the user only while it is pending and answers true when a row changed', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 1 });

      await expect(repository.updateIfPending(minimalUser())).resolves.toBe(
        true,
      );

      expect(user.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'pending' },
        data: expect.objectContaining({ name: 'Ana Rocha', status: 'pending' }),
      });
      expect(user.update).not.toHaveBeenCalled();
    });

    it('answers false when no row changed', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.updateIfPending(minimalUser())).resolves.toBe(
        false,
      );
    });
  });

  describe('findReactivationRequests', () => {
    it('selects the deleted users with a requested reactivation, oldest request first', async () => {
      const { user, repository } = setup();
      user.findMany.mockResolvedValue([minimalRecord]);

      const users = await repository.findReactivationRequests();

      expect(user.findMany).toHaveBeenCalledWith({
        where: { status: 'deleted', reactivationStatus: 'requested' },
        orderBy: [{ reactivationRequestedAt: 'asc' }, { id: 'asc' }],
        include: { rulesAcceptances: true },
      });
      expect(users.map((item) => item.id)).toEqual([ID]);
    });
  });

  describe('updateIfReactivationRequested', () => {
    it('writes the user only while it is deleted with a requested reactivation, clearing what the user no longer has', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.updateIfReactivationRequested(minimalUser()),
      ).resolves.toBe(true);

      expect(user.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'deleted', reactivationStatus: 'requested' },
        data: expect.objectContaining({
          name: 'Ana Rocha',
          reactivationStatus: null,
          reactivationRequestedAt: null,
          deletedAt: null,
        }),
      });
      expect(user.update).not.toHaveBeenCalled();
    });

    it('answers false when no row changed', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        repository.updateIfReactivationRequested(minimalUser()),
      ).resolves.toBe(false);
    });
  });

  describe('findRemovedSince', () => {
    it('selects the removed users removed after the cutoff, newest removal first', async () => {
      const { user, repository } = setup();
      user.findMany.mockResolvedValue([{ ...minimalRecord, status: 'removed', removedAt: new Date('2026-10-04T00:00:00.000Z') }]);
      const cutoff = new Date('2026-09-12T12:00:00.000Z');

      const found = await repository.findRemovedSince(cutoff);

      expect(found.map((item) => item.id)).toEqual([ID]);
      expect(user.findMany).toHaveBeenCalledWith({
        where: { status: 'removed', removedAt: { not: null, gt: cutoff } },
        orderBy: [{ removedAt: 'desc' }, { id: 'asc' }],
        include: expect.anything(),
      });
    });
  });

  describe('updateIfRemoved', () => {
    it('writes the user only while it is still removed, clearing what the user no longer has', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.updateIfRemoved(minimalUser()),
      ).resolves.toBe(true);

      expect(user.updateMany).toHaveBeenCalledWith({
        where: { id: ID, status: 'removed' },
        data: expect.objectContaining({ name: 'Ana Rocha', removedAt: null }),
      });
      expect(user.update).not.toHaveBeenCalled();
    });

    it('answers false when no row changed', async () => {
      const { user, repository } = setup();
      user.updateMany.mockResolvedValue({ count: 0 });

      await expect(repository.updateIfRemoved(minimalUser())).resolves.toBe(false);
    });
  });

  describe('findDeniedBefore', () => {
    it('selects the ids of the denied users denied at or before the cutoff', async () => {
      const { user, repository } = setup();
      user.findMany.mockResolvedValue([{ id: ID }]);
      const cutoff = new Date('2026-09-12T12:00:00.000Z');

      await expect(repository.findDeniedBefore(cutoff)).resolves.toEqual([ID]);

      expect(user.findMany).toHaveBeenCalledWith({
        where: { status: 'denied', deniedAt: { lte: cutoff } },
        select: { id: true },
      });
    });
  });

  describe('deleteDenied', () => {
    it('deletes the given users only while they are denied and answers how many', async () => {
      const { user, repository } = setup();
      user.deleteMany.mockResolvedValue({ count: 1 });

      await expect(repository.deleteDenied([ID])).resolves.toBe(1);

      expect(user.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [ID] }, status: 'denied' },
      });
    });

    it('queries nothing for an empty list', async () => {
      const { user, repository } = setup();

      await expect(repository.deleteDenied([])).resolves.toBe(0);

      expect(user.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('addRulesAcceptance', () => {
    const acceptedAt = new Date('2026-10-11T12:00:00.000Z');

    it('writes only the acceptance, skipping one already stored for the version', async () => {
      const { user, userRulesAcceptance, repository } = setup();
      userRulesAcceptance.createMany.mockResolvedValue({ count: 1 });

      await expect(
        repository.addRulesAcceptance(ID, { version: 3, acceptedAt }),
      ).resolves.toBeUndefined();

      expect(userRulesAcceptance.createMany).toHaveBeenCalledWith({
        data: [{ userId: ID, version: 3, acceptedAt }],
        skipDuplicates: true,
      });
      expect(user.update).not.toHaveBeenCalled();
    });
  });

  describe('countApprovedAdmins', () => {
    it('counts the approved admins', async () => {
      const { user, repository } = setup();
      user.count.mockResolvedValue(2);

      await expect(repository.countApprovedAdmins()).resolves.toBe(2);
      expect(user.count).toHaveBeenCalledWith({ where: { role: 'admin', status: 'approved' } });
    });
  });

  describe('updateKeepingAnAdmin', () => {
    const OTHER_ADMIN = '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f';
    const approvedAdmin = () => fullUser().clone({ status: 'approved' });
    const sqlOf = (call: unknown[]) => (call[0] as Prisma.Sql).sql;

    function lockAnswers(
      queryRaw: ReturnType<typeof setup>['$queryRaw'],
      admins: string[],
      stored: { role: string; status: string } | undefined,
    ) {
      queryRaw
        .mockResolvedValueOnce(admins.map((id) => ({ id })))
        .mockResolvedValueOnce(stored ? [stored] : []);
    }

    it('locks the approved admins, then the user, and writes in one transaction', async () => {
      const { user, $queryRaw, $transaction, repository } = setup();
      lockAnswers($queryRaw, [ID, OTHER_ADMIN], { role: 'admin', status: 'approved' });

      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin().clone({ role: 'instructor' }), {
          role: 'admin',
          status: 'approved',
        }),
      ).resolves.toBe('updated');

      expect($transaction).toHaveBeenCalledOnce();
      expect(sqlOf($queryRaw.mock.calls[0]!)).toBe(
        "SELECT id FROM users WHERE role = 'admin' AND status = 'approved' ORDER BY id FOR UPDATE",
      );
      expect(sqlOf($queryRaw.mock.calls[1]!)).toContain('FROM users WHERE id = ?::uuid FOR UPDATE');
      expect(($queryRaw.mock.calls[1]![0] as Prisma.Sql).values).toEqual([ID]);
      const call = user.update.mock.calls[0]![0];
      expect(call.where).toEqual({ id: ID });
      expect(call.data).toMatchObject({ role: 'instructor', status: 'approved' });
      expect(call.data.rulesAcceptances).toEqual({
        deleteMany: {},
        create: [{ version: 1, acceptedAt: fullRecord.rulesAcceptances[0]!.acceptedAt }],
      });
    });

    it.each([
      ['by role', { role: 'instructor' as const }],
      ['by status', { status: 'deleted' as const }],
    ])('answers lastAdmin, writing nothing, when the only approved admin would stop being one %s', async (_, change) => {
      const { user, $queryRaw, repository } = setup();
      lockAnswers($queryRaw, [ID], { role: 'admin', status: 'approved' });

      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin().clone(change), { role: 'admin', status: 'approved' }),
      ).resolves.toBe('lastAdmin');
      expect(user.update).not.toHaveBeenCalled();
    });

    it('writes a user who stays an admin, or never was one, even with no other admin', async () => {
      const { user, $queryRaw, repository } = setup();
      lockAnswers($queryRaw, [ID], { role: 'admin', status: 'approved' });
      lockAnswers($queryRaw, [OTHER_ADMIN], { role: 'student', status: 'approved' });

      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin().clone({ name: 'Ana R.' }), {
          role: 'admin',
          status: 'approved',
        }),
      ).resolves.toBe('updated');
      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin(), { role: 'student', status: 'approved' }),
      ).resolves.toBe('updated');
      expect(user.update).toHaveBeenCalledTimes(2);
    });

    it.each([
      ['the role', { role: 'student', status: 'approved' }],
      ['the status', { role: 'admin', status: 'removed' }],
    ])('answers changed, writing nothing, when the stored %s is not the expected one', async (_, stored) => {
      const { user, $queryRaw, repository } = setup();
      lockAnswers($queryRaw, [OTHER_ADMIN], stored);

      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin().clone({ role: 'instructor' }), {
          role: 'admin',
          status: 'approved',
        }),
      ).resolves.toBe('changed');
      expect(user.update).not.toHaveBeenCalled();
    });

    it('answers changed when the user is gone', async () => {
      const { user, $queryRaw, repository } = setup();
      lockAnswers($queryRaw, [OTHER_ADMIN], undefined);

      await expect(
        repository.updateKeepingAnAdmin(approvedAdmin(), { role: 'admin', status: 'approved' }),
      ).resolves.toBe('changed');
      expect(user.update).not.toHaveBeenCalled();
    });
  });
});
