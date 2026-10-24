import { Body, Controller, Get, HttpCode, HttpStatus, Param, Put, Query } from '@nestjs/common';
import {
  ChangeRole,
  ChangeRoleIn,
  ChangeRoleOut,
  ListPeople,
  ListPeopleOut,
} from '@rochas-surf-school/auth';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { ClassesTeachingReleaser } from '../classes/classes.teaching-releaser.js';
import { EnrolmentSeatReleaser } from '../enrolment/enrolment.seat-releaser.js';
import { NotificationsRoleChangeNotifier } from '../notifications/notifications.role-change-notifier.js';
import { PrismaUserRepository } from './user.prisma.js';

@Controller('people')
export class PeopleController {
  constructor(
    private readonly userRepository: PrismaUserRepository,
    private readonly seatReleaser: EnrolmentSeatReleaser,
    private readonly teachingReleaser: ClassesTeachingReleaser,
    private readonly roleChangeNotifier: NotificationsRoleChangeNotifier,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
  ): Promise<ListPeopleOut> {
    return new ListPeople(this.userRepository).execute({
      actor: { id: user.id, role: user.role, status: user.status },
      page,
      perPage,
      role,
      search,
    });
  }

  @Put(':id/role')
  @HttpCode(HttpStatus.OK)
  changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: Partial<Pick<ChangeRoleIn, 'role'>> | undefined,
  ): Promise<ChangeRoleOut> {
    return new ChangeRole(
      this.userRepository,
      this.seatReleaser,
      this.teachingReleaser,
      this.roleChangeNotifier,
    ).execute({
      actor: { id: user.id, role: user.role, status: user.status },
      userId: id,
      role: body?.role,
    });
  }
}
