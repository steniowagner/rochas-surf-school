import { Enrolment } from '@rochas-surf-school/enrolment';
import { EnrolmentClassEnrolmentsCloser } from './enrolment.class-enrolments-closer.js';
import type { PrismaEnrolmentRepository } from './enrolment.prisma.js';
import type { SystemClockProvider } from './system.clock.js';

const NOW = new Date('2026-10-19T09:00:00.000Z');

function closed(studentId: string) {
  return new Enrolment({
    classId: '3b5c7d9e-1a2b-4c3d-8e4f-5a6b7c8d9e0f',
    studentId,
    status: 'classCancelled',
    requestedAt: NOW,
  });
}

describe('EnrolmentClassEnrolmentsCloser', () => {
  it('closes the open enrolments of the class and answers their students', async () => {
    const repository = {
      closeOpenForClass: vi.fn(async () => [
        closed('5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25'),
        closed('8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b'),
      ]),
    };
    const clock = { now: () => NOW };
    const closer = new EnrolmentClassEnrolmentsCloser(
      repository as unknown as PrismaEnrolmentRepository,
      clock as unknown as SystemClockProvider,
    );

    expect(await closer.closeOpenEnrolments('c-1')).toEqual([
      '5d1f0a7b-2c3e-4b6a-8f19-4a7c9e0d1b25',
      '8e0f1a2b-3c4d-4e5f-9a6b-7c8d9e0f1a2b',
    ]);
    expect(repository.closeOpenForClass).toHaveBeenCalledWith('c-1', NOW);
  });
});
