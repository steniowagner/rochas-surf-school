import { Injectable } from '@nestjs/common';
import { ClockProvider } from '@rochas-surf-school/notifications';

@Injectable()
export class SystemClockProvider implements ClockProvider {
  now(): Date {
    return new Date();
  }
}
