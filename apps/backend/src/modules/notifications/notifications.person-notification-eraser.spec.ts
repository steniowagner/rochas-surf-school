import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsPersonNotificationEraser } from './notifications.person-notification-eraser.js';

describe('NotificationsPersonNotificationEraser', () => {
  it('deletes the notifications about the erased accounts', async () => {
    const deleteAbout = vi.fn();
    const eraser = new NotificationsPersonNotificationEraser({
      deleteAbout,
    } as unknown as PrismaNotificationRepository);

    await eraser.erase(['user-1', 'user-2']);

    expect(deleteAbout).toHaveBeenCalledWith(['user-1', 'user-2']);
  });
});
