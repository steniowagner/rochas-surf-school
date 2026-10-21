import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Put,
} from '@nestjs/common';
import {
  GetSchoolSettings,
  SchoolSettingsActor,
  SchoolSettingsOut,
  SetSchoolWhatsapp,
  SetSchoolWhatsappIn,
  SetWaitingList,
  SetWaitingListIn,
} from '@rochas-surf-school/school-settings';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaSchoolSettingsRepository } from './school-settings.prisma.js';

function actorOf(user: AuthenticatedUser): SchoolSettingsActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('school-settings')
export class SchoolSettingsController {
  constructor(
    private readonly schoolSettingsRepository: PrismaSchoolSettingsRepository,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  get(@CurrentUser() user: AuthenticatedUser): Promise<SchoolSettingsOut> {
    return new GetSchoolSettings(this.schoolSettingsRepository).execute({
      actor: actorOf(user),
    });
  }

  @Put('whatsapp')
  @HttpCode(HttpStatus.OK)
  setWhatsapp(
    @CurrentUser() user: AuthenticatedUser,
    @Body()
    body: Partial<Pick<SetSchoolWhatsappIn, 'whatsappNumber'>> | undefined,
  ): Promise<SchoolSettingsOut> {
    return new SetSchoolWhatsapp(this.schoolSettingsRepository).execute({
      actor: actorOf(user),
      whatsappNumber: body?.whatsappNumber,
    });
  }

  @Put('waiting-list')
  @HttpCode(HttpStatus.OK)
  setWaitingList(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: Partial<Pick<SetWaitingListIn, 'enabled'>> | undefined,
  ): Promise<SchoolSettingsOut> {
    return new SetWaitingList(this.schoolSettingsRepository).execute({
      actor: actorOf(user),
      enabled: body?.enabled,
    });
  }
}
