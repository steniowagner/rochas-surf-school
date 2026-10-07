import { Identity } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaIdentityRepository } from './identity.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const USER_ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const CREATED_AT = new Date('2026-10-01T00:00:00.000Z');
const UPDATED_AT = new Date('2026-10-02T00:00:00.000Z');

const record = {
  id: ID,
  userId: USER_ID,
  provider: 'email',
  providerUserId: 'ana@example.com',
  email: 'ana@example.com',
  createdAt: CREATED_AT,
  updatedAt: UPDATED_AT,
  deletedAt: null,
};

function setup() {
  const identity = { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() };
  const repository = new PrismaIdentityRepository({ identity } as unknown as PrismaService);
  return { identity, repository };
}

describe('PrismaIdentityRepository', () => {
  it('creates an identity and maps the record back', async () => {
    const { identity, repository } = setup();
    identity.create.mockResolvedValue(record);

    const created = await repository.create(
      new Identity({
        id: ID,
        userId: USER_ID,
        provider: 'email',
        providerUserId: 'ana@example.com',
        email: 'ana@example.com',
        createdAt: CREATED_AT,
      }),
    );

    expect(identity.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        userId: USER_ID,
        provider: 'email',
        providerUserId: 'ana@example.com',
        email: 'ana@example.com',
        createdAt: CREATED_AT,
        deletedAt: null,
      },
    });
    expect(created).toBeInstanceOf(Identity);
    expect(created).toMatchObject({
      id: ID,
      userId: USER_ID,
      provider: 'email',
      providerUserId: 'ana@example.com',
      email: 'ana@example.com',
    });
    expect(created.updatedAt).toEqual(UPDATED_AT);
  });

  it('writes null and reads undefined when there is no email', async () => {
    const { identity, repository } = setup();
    identity.create.mockResolvedValue({ ...record, provider: 'apple', email: null });

    const created = await repository.create(
      new Identity({
        userId: USER_ID,
        provider: 'apple',
        providerUserId: 'apple-sub',
        deletedAt: new Date('2026-10-05T00:00:00.000Z'),
      }),
    );

    expect(identity.create.mock.calls[0]![0].data).toMatchObject({
      email: null,
      deletedAt: new Date('2026-10-05T00:00:00.000Z'),
    });
    expect(created.email).toBeUndefined();
  });

  it('finds by provider and provider user id', async () => {
    const { identity, repository } = setup();
    identity.findUnique.mockResolvedValueOnce(record).mockResolvedValueOnce(null);

    expect((await repository.findByProvider('email', 'ana@example.com'))?.id).toBe(ID);
    await expect(repository.findByProvider('google', 'nope')).resolves.toBeNull();
    expect(identity.findUnique).toHaveBeenNthCalledWith(1, {
      where: {
        provider_providerUserId: { provider: 'email', providerUserId: 'ana@example.com' },
      },
    });
  });

  it('finds every identity of a user', async () => {
    const { identity, repository } = setup();
    identity.findMany.mockResolvedValue([record]);

    const identities = await repository.findByUserId(USER_ID);

    expect(identity.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'asc' },
    });
    expect(identities.map((item) => item.id)).toEqual([ID]);
  });
});
