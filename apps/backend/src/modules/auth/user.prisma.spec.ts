import { User } from '@rochas-surf-school/auth';
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
    count: vi.fn(),
  };
  const repository = new PrismaUserRepository({ user } as unknown as PrismaService);
  return { user, repository };
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
      deletedAt: null,
      rulesAcceptances: { create: [] },
    });
    expect(created.photoUrl).toBeUndefined();
    expect(created.whatsappNumber).toBeUndefined();
    expect(created.denialReason).toBeUndefined();
    expect(created.deniedAt).toBeUndefined();
    expect(created.removedAt).toBeUndefined();
    expect(created.reactivationStatus).toBeUndefined();
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
});
