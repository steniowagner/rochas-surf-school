import { Injectable } from '@nestjs/common';
import type { SeatCounter } from '@rochas-surf-school/classes';

/** No enrolment exists yet, so no seat is ever taken. The enrolment spec replaces this with the real count. */
@Injectable()
export class NoEnrolmentSeatCounter implements SeatCounter {
  async countSeatsTaken(): Promise<number> {
    return 0;
  }
}
