import { Injectable } from '@nestjs/common';
import type { ClockProvider } from '@rochas-surf-school/enrolment';

@Injectable()
export class SystemClockProvider implements ClockProvider {
  now(): Date {
    return new Date();
  }
}
