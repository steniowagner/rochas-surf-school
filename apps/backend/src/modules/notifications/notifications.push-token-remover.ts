import { Injectable } from '@nestjs/common';
import { PushTokenRemover } from '@rochas-surf-school/auth';
import { RemovePushToken } from '@rochas-surf-school/notifications';
import { PrismaPushTokenRepository } from './push-token.prisma.js';

/** The adapter of `auth`'s PushTokenRemover port. */
@Injectable()
export class NotificationsPushTokenRemover implements PushTokenRemover {
  constructor(private readonly pushTokenRepository: PrismaPushTokenRepository) {}

  remove(userId: string, token: string): Promise<void> {
    return new RemovePushToken(this.pushTokenRepository).execute({ userId, token });
  }
}
