import { RefreshToken } from '@rochas-surf-school/auth';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaRefreshTokenRepository } from './refresh-token.prisma.js';

const ID = '3c9c1b9e-1f5e-4d8e-9a3b-6f7e8d9c0b1a';
const USER_ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const FAMILY_ID = '0b7e4d2a-5c1f-4e3b-8a9d-2f6c7b8e9d0a';
const NOW = new Date('2026-10-07T12:00:00.000Z');
const EXPIRES_AT = new Date('2026-11-06T12:00:00.000Z');

function setup() {
  const refreshToken = { create: vi.fn() };
  const repository = new PrismaRefreshTokenRepository({
    refreshToken,
  } as unknown as PrismaService);
  return { refreshToken, repository };
}

function record(revokedAt: Date | null) {
  return {
    id: ID,
    userId: USER_ID,
    tokenHash: 'f'.repeat(64),
    familyId: FAMILY_ID,
    expiresAt: EXPIRES_AT,
    revokedAt,
    createdAt: NOW,
    updatedAt: NOW,
    deletedAt: null,
  };
}

describe('PrismaRefreshTokenRepository', () => {
  it('stores the token hash and maps the record back', async () => {
    const { refreshToken, repository } = setup();
    refreshToken.create.mockResolvedValue(record(null));

    const created = await repository.create(
      new RefreshToken({
        id: ID,
        userId: USER_ID,
        tokenHash: 'f'.repeat(64),
        familyId: FAMILY_ID,
        expiresAt: EXPIRES_AT,
        createdAt: NOW,
      }),
    );

    expect(refreshToken.create).toHaveBeenCalledWith({
      data: {
        id: ID,
        userId: USER_ID,
        tokenHash: 'f'.repeat(64),
        familyId: FAMILY_ID,
        expiresAt: EXPIRES_AT,
        revokedAt: null,
        createdAt: NOW,
      },
    });
    expect(created).toBeInstanceOf(RefreshToken);
    expect(created).toMatchObject({ id: ID, userId: USER_ID, familyId: FAMILY_ID });
    expect(created.revokedAt).toBeUndefined();
  });

  it('keeps the revocation date', async () => {
    const { refreshToken, repository } = setup();
    const revokedAt = new Date('2026-10-08T12:00:00.000Z');
    refreshToken.create.mockResolvedValue(record(revokedAt));

    const created = await repository.create(
      new RefreshToken({
        userId: USER_ID,
        tokenHash: 'f'.repeat(64),
        familyId: FAMILY_ID,
        expiresAt: EXPIRES_AT,
        revokedAt,
      }),
    );

    expect(refreshToken.create.mock.calls[0]![0].data.revokedAt).toEqual(revokedAt);
    expect(created.revokedAt).toEqual(revokedAt);
  });
});
