import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ClassActor,
  CreateLocation,
  CreateLocationIn,
  ListLocations,
  ListLocationsOut,
  LocationOut,
} from '@rochas-surf-school/classes';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaLocationRepository } from './location.prisma.js';

type CreateLocationBody = Partial<Pick<CreateLocationIn, 'name' | 'address'>> | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationRepository: PrismaLocationRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListLocationsOut> {
    return new ListLocations(this.locationRepository).execute({ actor: actorOf(user) });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: CreateLocationBody,
  ): Promise<LocationOut> {
    return new CreateLocation(this.locationRepository).execute({
      actor: actorOf(user),
      name: body?.name,
      address: body?.address,
    });
  }
}
