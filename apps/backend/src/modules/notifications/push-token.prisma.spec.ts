import { PushToken } from '@rochas-surf-school/notifications';
import { PrismaService } from '../../db/prisma.service.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';

const USER_ID = '8f14e45f-ceea-4e7a-9b1d-0c1a2b3c4d5e';
const NOW = new Date('2026-10-12T12:00:00.000Z');

function setup() {
  const pushToken = {
    upsert: vi.fn(),
    findMany: vi.fn(),
    deleteMany: vi.fn(),
  };
  const repository = new PrismaPushTokenRepository({ pushToken } as unknown as PrismaService);
  return { pushToken, repository };
}

describe('PrismaPushTokenRepository', () => {
  it('upserts by token, moving it to the caller with the locale and time', async () => {
    const { pushToken, repository } = setup();

    await repository.upsert(
      new PushToken({
        token: 'ExponentPushToken[abc]',
        userId: USER_ID,
        locale: 'es',
        createdAt: NOW,
        updatedAt: NOW,
      }),
    );

    expect(pushToken.upsert).toHaveBeenCalledWith({
      where: { token: 'ExponentPushToken[abc]' },
      create: { token: 'ExponentPushToken[abc]', userId: USER_ID, locale: 'es', createdAt: NOW, updatedAt: NOW },
      update: { userId: USER_ID, locale: 'es', updatedAt: NOW },
    });
  });

  it('finds the tokens of the users, mapped to the domain', async () => {
    const { pushToken, repository } = setup();
    pushToken.findMany.mockResolvedValue([
      { token: 'ExpoPushToken[a]', userId: USER_ID, locale: 'pt-BR', createdAt: NOW, updatedAt: NOW },
    ]);

    const found = await repository.findByUserIds([USER_ID]);

    expect(pushToken.findMany).toHaveBeenCalledWith({
      where: { userId: { in: [USER_ID] } },
      orderBy: [{ createdAt: 'asc' }, { token: 'asc' }],
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ token: 'ExpoPushToken[a]', userId: USER_ID, locale: 'pt-BR' });
  });

  it('deletes by token, by tokens, and for a user only', async () => {
    const { pushToken, repository } = setup();

    await repository.deleteByToken('ExpoPushToken[a]');
    await repository.deleteByTokens(['ExpoPushToken[a]', 'ExpoPushToken[b]']);
    await repository.deleteForUser(USER_ID, 'ExpoPushToken[a]');

    expect(pushToken.deleteMany.mock.calls).toEqual([
      [{ where: { token: 'ExpoPushToken[a]' } }],
      [{ where: { token: { in: ['ExpoPushToken[a]', 'ExpoPushToken[b]'] } } }],
      [{ where: { userId: USER_ID, token: 'ExpoPushToken[a]' } }],
    ]);
  });
});
