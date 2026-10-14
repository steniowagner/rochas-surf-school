import { Body, Controller, Delete, HttpCode, HttpStatus, Put } from '@nestjs/common';
import {
  RegisterPushToken,
  RegisterPushTokenIn,
  UnregisterPushToken,
} from '@rochas-surf-school/notifications';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly pushTokenRepository: PrismaPushTokenRepository,
    private readonly clock: SystemClockProvider,
  ) {}

  @Put('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<Pick<RegisterPushTokenIn, 'token' | 'locale'>> | undefined,
  ): Promise<void> {
    return new RegisterPushToken(this.pushTokenRepository, this.clock).execute({
      actor: { id: user.id, status: user.status },
      token: body?.token,
      locale: body?.locale,
    });
  }

  @Delete('push-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  unregisterPushToken(
    @CurrentUser('id') id: string,
    @Body() body: { token?: unknown } | undefined,
  ): Promise<void> {
    return new UnregisterPushToken(this.pushTokenRepository).execute({
      userId: id,
      token: body?.token,
    });
  }
}
