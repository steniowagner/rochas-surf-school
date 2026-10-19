import type { ClassRosterReader } from '@rochas-surf-school/classes';
import { NoEnrolmentClassRosterReader } from './no-enrolment.class-roster.reader.js';

describe('NoEnrolmentClassRosterReader', () => {
  it('answers no roster for any class, which reads as no seat taken and no student', async () => {
    const reader: ClassRosterReader = new NoEnrolmentClassRosterReader();

    const rosters = await reader.findRosters(['a', 'b'], 4);

    expect(rosters.size).toBe(0);
  });
});
