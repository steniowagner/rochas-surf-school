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
  AdminMessage,
  BroadcastActor,
  CountBroadcastRecipients,
  CountBroadcastRecipientsOut,
  CountUnreadNotifications,
  CountUnreadNotificationsOut,
  GetNotification,
  ListNotifications,
  MarkAllNotificationsRead,
  MarkNotificationRead,
  NotificationOut,
  NotificationType,
  Notify,
  PushLocale,
  RegisterPushToken,
  RegisterPushTokenIn,
  SendBroadcast,
  UnregisterPushToken,
} from '@rochas-surf-school/notifications';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { ExpoPushProvider } from './expo.push.js';
import { PrismaMessageSenderReader } from './message-sender-reader.prisma.js';
import { PrismaNotificationRepository } from './notification.prisma.js';
import { renderInApp } from './push-messages.js';
import { PrismaPushTicketRepository } from './push-ticket.prisma.js';
import { PrismaPushTokenRepository } from './push-token.prisma.js';
import { PrismaRecipientsProvider } from './recipients.prisma.js';
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
  /** What an admin wrote and who sent it, for `broadcast` and `class.message`; null for every other type. */
  adminMessage: AdminMessage | null;
}

export interface NotificationsPageOut {
  items: NotificationItemOut[];
  page: number;
  perPage: number;
  total: number;
}

const actorOf = (user: AuthenticatedUser): BroadcastActor => ({
  id: user.id,
  role: user.role,
  status: user.status,
});

const isApprovedAdmin = (user: AuthenticatedUser): boolean =>
  user.role === 'admin' && user.status === 'approved';

const toItem = (item: NotificationOut, locale: PushLocale): NotificationItemOut => ({
  id: item.id,
  type: item.type,
  classId: typeof item.params.classId === 'string' ? item.params.classId : null,
  ...renderInApp(item.type, item.params, locale),
  createdAt: item.createdAt,
  read: item.read,
  adminMessage: item.adminMessage,
});

@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly pushTokenRepository: PrismaPushTokenRepository,
    private readonly clock: SystemClockProvider,
    private readonly notificationRepository: PrismaNotificationRepository,
    private readonly pushTicketRepository: PrismaPushTicketRepository,
    private readonly pushProvider: ExpoPushProvider,
    private readonly recipientsProvider: PrismaRecipientsProvider,
    private readonly messageSenderReader: PrismaMessageSenderReader,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('locale') locale?: string,
  ): Promise<NotificationsPageOut> {
    const result = await new ListNotifications(
      this.notificationRepository,
      this.messageSenderReader,
    ).execute({
      userId: user.id,
      viewerIsAdmin: isApprovedAdmin(user),
      page,
      perPage,
      locale,
    });

    return {
      items: result.items.map((item) => toItem(item, result.locale)),
      page: result.page,
      perPage: result.perPage,
      total: result.total,
    };
  }

  @Get('broadcast/recipients')
  @HttpCode(HttpStatus.OK)
  countBroadcastRecipients(
    @CurrentUser() user: AuthenticatedUser,
    @Query('audience') audience?: string,
  ): Promise<CountBroadcastRecipientsOut> {
    return new CountBroadcastRecipients(this.recipientsProvider).execute({
      actor: actorOf(user),
      audience,
    });
  }

  @Post('broadcast')
  @HttpCode(HttpStatus.NO_CONTENT)
  sendBroadcast(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { audience?: unknown; title?: unknown; message?: unknown } | undefined,
  ): Promise<void> {
    const notify = new Notify(
      this.notificationRepository,
      this.pushTokenRepository,
      this.pushTicketRepository,
      this.pushProvider,
      this.clock,
    );
    return new SendBroadcast(this.recipientsProvider, notify).execute({
      actor: actorOf(user),
      audience: body?.audience,
      title: body?.title,
      message: body?.message,
    });
  }

  @Get('unread-count')
  @HttpCode(HttpStatus.OK)
  countUnread(@CurrentUser('id') id: string): Promise<CountUnreadNotificationsOut> {
    return new CountUnreadNotifications(this.notificationRepository).execute({ userId: id });
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async one(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') notificationId: string,
    @Query('locale') locale?: string,
  ): Promise<NotificationItemOut> {
    const result = await new GetNotification(
      this.notificationRepository,
      this.messageSenderReader,
    ).execute({
      userId: user.id,
      notificationId,
      viewerIsAdmin: isApprovedAdmin(user),
      locale,
    });

    return toItem(result.item, result.locale);
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
