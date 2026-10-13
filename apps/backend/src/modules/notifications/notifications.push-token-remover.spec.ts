import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { NotificationsPushTokenRemover } from './notifications.push-token-remover.js';

describe('NotificationsPushTokenRemover', () => {
  it("deletes the token only for the user's own device", async () => {
    const deleteForUser = vi.fn();
    const remover = new NotificationsPushTokenRemover({
      deleteForUser,
    } as unknown as PrismaPushTokenRepository);

    await remover.remove('user-1', 'ExpoPushToken[a]');

    expect(deleteForUser).toHaveBeenCalledWith('user-1', 'ExpoPushToken[a]');
  });
});
