import { Injectable } from '@nestjs/common';
import type { ClassRoster, ClassRosterReader } from '@rochas-surf-school/classes';

/** No enrolment exists yet, so no class has a seat taken or a student. The enrolment spec replaces this with the real read. */
@Injectable()
export class NoEnrolmentClassRosterReader implements ClassRosterReader {
  async findRosters(): Promise<Map<string, ClassRoster>> {
    return new Map();
  }
}
