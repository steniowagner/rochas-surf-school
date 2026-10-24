import { SchoolClass } from '@rochas-surf-school/classes';
import { NotificationsNoInstructorNotifier } from '../notifications/notifications.no-instructor-notifier.js';
import { ClassesTeachingReleaser } from './classes.teaching-releaser.js';
import { PrismaSchoolClassRepository } from './school-class.prisma.js';
import { SystemClockProvider } from './system.clock.js';

const USER_ID = '7a2e9c41-5b8d-4f03-a6e1-3c9d0b7f5e12';
const OTHER_ID = '0b4d1c6e-3f7a-4c58-9a21-7d5e8f1a2b34';
const NOW = new Date('2026-10-14T12:00:00.000Z');

function upcoming(instructorIds: string[]) {
  return new SchoolClass({
    discipline: 'surf',
    level: 'beginner',
    startsAt: new Date('2026-10-15T11:00:00.000Z'),
    endsAt: new Date('2026-10-15T12:00:00.000Z'),
    locationId: 'c3f1a9d2-6e47-4b58-8d03-1f2a7b9c4e65',
    instructorIds,
    capacity: 8,
    createdBy: OTHER_ID,
  });
}

function setup(classes: SchoolClass[]) {
  const repository = {
    findUpcomingTaughtBy: vi.fn().mockResolvedValue(classes),
    removeInstructor: vi.fn().mockResolvedValue(undefined),
  };
  const notifier = { classesWithoutInstructor: vi.fn().mockResolvedValue(undefined) };
  const releaser = new ClassesTeachingReleaser(
    repository as unknown as PrismaSchoolClassRepository,
    notifier as unknown as NotificationsNoInstructorNotifier,
    { now: () => NOW } as SystemClockProvider,
  );
  return { repository, notifier, releaser };
}

describe('ClassesTeachingReleaser', () => {
  it('releases the person from their upcoming classes and tells the admins about those left with nobody', async () => {
    const shared = upcoming([USER_ID, OTHER_ID]);
    const alone = upcoming([USER_ID]);
    const { repository, notifier, releaser } = setup([shared, alone]);

    await expect(releaser.releaseUpcomingClasses(USER_ID)).resolves.toBe(2);

    expect(repository.findUpcomingTaughtBy).toHaveBeenCalledWith(USER_ID, NOW);
    expect(repository.removeInstructor).toHaveBeenCalledWith(USER_ID, [shared.id, alone.id]);
    expect(notifier.classesWithoutInstructor).toHaveBeenCalledWith({
      count: 1,
      classId: alone.id,
      discipline: 'surf',
      startsAt: alone.startsAt,
      excludeUserIds: [USER_ID],
    });
  });

  it('leaves the actor out of the notification too, and answers 0 with nothing to release', async () => {
    const alone = upcoming([USER_ID]);
    const { notifier, releaser } = setup([alone]);

    await expect(releaser.releaseUpcomingClasses(USER_ID, OTHER_ID)).resolves.toBe(1);
    expect(notifier.classesWithoutInstructor).toHaveBeenCalledWith(
      expect.objectContaining({ excludeUserIds: [USER_ID, OTHER_ID] }),
    );
    await expect(setup([]).releaser.releaseUpcomingClasses(USER_ID, OTHER_ID)).resolves.toBe(0);
  });

  it('propagates a failed write', async () => {
    const { repository, releaser } = setup([upcoming([USER_ID])]);
    repository.removeInstructor.mockRejectedValue(new Error('db down'));

    await expect(releaser.releaseUpcomingClasses(USER_ID)).rejects.toThrow('db down');
  });
});
