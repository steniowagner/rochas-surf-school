import { Injectable } from '@nestjs/common';
import type { PendingRequestCounter } from '@rochas-surf-school/classes';

/** No enrolment exists yet, so no request is ever pending. The enrolment spec replaces this with the real count. */
@Injectable()
export class NoEnrolmentPendingRequestCounter implements PendingRequestCounter {
  async countPendingRequests(): Promise<number> {
    return 0;
  }
}
