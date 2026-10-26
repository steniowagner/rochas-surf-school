import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApproveReactivation,
  ApproveReactivationOut,
  DenyReactivation,
  DenyReactivationIn,
  DenyReactivationOut,
  ListReactivationRequests,
  ListReactivationRequestsOut,
  RegistrationActor,
} from '@rochas-surf-school/auth';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaClassesTakenCounter } from '../enrolment/classes-taken-counter.prisma.js';
import { NotificationsReactivationNotifier } from '../notifications/notifications.reactivation-notifier.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

function actorOf(user: AuthenticatedUser): RegistrationActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('reactivation-requests')
export class ReactivationRequestsController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly classesTakenCounter: PrismaClassesTakenCounter,
    private readonly clock: SystemClockProvider,
    private readonly reactivationNotifier: NotificationsReactivationNotifier,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListReactivationRequestsOut> {
    return new ListReactivationRequests(
      this.userRepository,
      this.classesTakenCounter,
      this.clock,
    ).execute({ actor: actorOf(user) });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApproveReactivationOut> {
    return new ApproveReactivation(this.userRepository, this.reactivationNotifier).execute({
      actor: actorOf(user),
      userId: id,
    });
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  deny(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<Pick<DenyReactivationIn, 'reason'>> | undefined,
  ): Promise<DenyReactivationOut> {
    return new DenyReactivation(this.userRepository, this.reactivationNotifier).execute({
      actor: actorOf(user),
      userId: id,
      reason: body?.reason,
    });
  }
}
