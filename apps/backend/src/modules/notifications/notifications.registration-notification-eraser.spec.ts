import { PrismaNotificationRepository } from './notification.prisma.js';
import { NotificationsRegistrationNotificationEraser } from './notifications.registration-notification-eraser.js';

describe('NotificationsRegistrationNotificationEraser', () => {
  it('deletes the registration notifications about the erased accounts', async () => {
    const deleteRegistrationPending = vi.fn();
    const eraser = new NotificationsRegistrationNotificationEraser({
      deleteRegistrationPending,
    } as unknown as PrismaNotificationRepository);

    await eraser.erase(['user-1', 'user-2']);

    expect(deleteRegistrationPending).toHaveBeenCalledWith(['user-1', 'user-2']);
  });
});
