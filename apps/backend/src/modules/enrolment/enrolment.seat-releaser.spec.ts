import { Enrolment } from '@rochas-surf-school/enrolment';
import { NotificationsEnrolmentNotifier } from '../notifications/notifications.enrolment-notifier.js';
import { PrismaEnrolmentClassReader } from './enrolment-class-reader.prisma.js';
import type { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import { EnrolmentSeatReleaser } from './enrolment.seat-releaser.js';
import type { PrismaStudentNameReader } from './student-name-reader.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-19T09:00:00.000Z');
const STARTS_AT = new Date('2026-10-19T11:00:00.000Z');
const CLASS_ID = '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f';
const STUDENT_ID = '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25';

function setup() {
  const repository = {
    releaseForStudent: vi.fn(async () => ({
      cancelled: [
        new Enrolment({ classId: CLASS_ID, studentId: STUDENT_ID, status: 'cancelled', requestedAt: NOW }),
      ],
      withdrawn: 2,
    })),
    countPendingForClass: vi.fn(async () => 2),
  };
  const classReader = {
    findById: vi.fn(async () => ({ id: CLASS_ID, discipline: 'surf', startsAt: STARTS_AT, instructorIds: ['i-1'] })),
  };
  const nameReader = { findName: vi.fn(async () => 'Ana Souza') };
  const notifier = { seatCancelled: vi.fn(async () => undefined) };
  const releaser = new EnrolmentSeatReleaser(
    repository as unknown as PrismaEnrolmentRepository,
    classReader as unknown as PrismaEnrolmentClassReader,
    nameReader as unknown as PrismaStudentNameReader,
    notifier as unknown as NotificationsEnrolmentNotifier,
    { now: () => NOW } as SystemClockProvider,
  );

  return { repository, notifier, releaser };
}

describe('EnrolmentSeatReleaser', () => {
  it('gives up the seats and requests of the person and tells the school about each cancelled seat', async () => {
    const { repository, notifier, releaser } = setup();

    await expect(releaser.releaseSeats(STUDENT_ID)).resolves.toBe(3);

    expect(repository.releaseForStudent).toHaveBeenCalledWith(STUDENT_ID, NOW);
    expect(notifier.seatCancelled).toHaveBeenCalledWith({
      classId: CLASS_ID,
      studentName: 'Ana Souza',
      discipline: 'surf',
      startsAt: STARTS_AT,
      waitingCount: 2,
      instructorIds: ['i-1'],
    });
  });

  it('answers 0 when the person held nothing', async () => {
    const { repository, notifier, releaser } = setup();
    repository.releaseForStudent.mockResolvedValue({ cancelled: [], withdrawn: 0 });

    await expect(releaser.releaseSeats(STUDENT_ID)).resolves.toBe(0);
    expect(notifier.seatCancelled).not.toHaveBeenCalled();
  });

  it('lets a failed write propagate', async () => {
    const { repository, releaser } = setup();
    repository.releaseForStudent.mockRejectedValue(new Error('db down'));

    await expect(releaser.releaseSeats(STUDENT_ID)).rejects.toThrow('db down');
  });
});
