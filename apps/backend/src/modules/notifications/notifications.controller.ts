import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  CountUnreadNotifications,
  CountUnreadNotificationsOut,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  NotificationType,
  RegisterPushToken,
  RegisterPushTokenIn,
  UnregisterPushToken,
} from '@rochas-surf-school/notifications';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { renderInApp } from './push-messages.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { SystemClockProvider } from './system.clock.js';

/** A notification as the app's notifications screen draws it: the text is already written, the params stay here. */
export interface NotificationItemOut {
  id: string;
  type: NotificationType;
  classId: string | null;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationsPageOut {
  items: NotificationItemOut[];
  page: number;
  perPage: number;
  total: number;
}

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly pushTokenRepository: PrismaPushTokenRepository,
    private readonly clock: SystemClockProvider,
    private readonly notificationRepository: PrismaNotificationRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser('id') id: string,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('locale') locale?: string,
  ): Promise<NotificationsPageOut> {
    const result = await new ListNotifications(this.notificationRepository).execute({
      userId: id,
      page,
      perPage,
      locale,
    });

    return {
      items: result.items.map((item) => ({
        id: item.id,
        type: item.type,
        classId: typeof item.params.classId === 'string' ? item.params.classId : null,
        ...renderInApp(item.type, item.params, result.locale),
        createdAt: item.createdAt,
        read: item.read,
      })),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  countUnread(@CurrentUser('id') id: string): Promise<CountUnreadNotificationsOut> {
    return new CountUnreadNotifications(this.notificationRepository).execute({ userId: id });
  }

  @Post('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  markAllRead(@CurrentUser('id') id: string): Promise<void> {
    return new MarkAllNotificationsRead(this.notificationRepository, this.clock).execute({
      userId: id,
    });
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  markRead(
    @CurrentUser('id') id: string,
    @Param('id') notificationId: string,
  ): Promise<void> {
    return new MarkNotificationRead(this.notificationRepository, this.clock).execute({
      userId: id,
      notificationId,
    });
  }

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
