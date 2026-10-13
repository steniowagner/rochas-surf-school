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
  ApproveRegistration,
  ApproveRegistrationOut,
  DenyRegistration,
  DenyRegistrationIn,
  DenyRegistrationOut,
  ListRegistrations,
  ListRegistrationsOut,
  RegistrationActor,
} from '@rochas-surf-school/auth';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsRegistrationNotifier } from '../notifications/notifications.registration-notifier.js';
import { SystemClockProvider } from './system.clock.js';
import { PrismaUserRepository } from './user.prisma.js';

function actorOf(user: AuthenticatedUser): RegistrationActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('registrations')
export class RegistrationsController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly clock: SystemClockProvider,
    private readonly registrationNotifier: NotificationsRegistrationNotifier,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListRegistrationsOut> {
    return new ListRegistrations(this.userRepository).execute({
      actor: actorOf(user),
    });
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  approve(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<ApproveRegistrationOut> {
    return new ApproveRegistration(this.userRepository, this.registrationNotifier).execute({
      actor: actorOf(user),
      registrationId: id,
    });
  }

  @Post(':id/deny')
  @HttpCode(HttpStatus.OK)
  deny(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<Pick<DenyRegistrationIn, 'reason'>> | undefined,
  ): Promise<DenyRegistrationOut> {
    return new DenyRegistration(
      this.userRepository,
      this.clock,
      this.registrationNotifier,
    ).execute({
      actor: actorOf(user),
      registrationId: id,
      reason: body?.reason,
    });
  }
}
