import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  AddressPlace,
  ArchiveLocation,
  ClassActor,
  CreateLocation,
  CreateLocationIn,
  EditLocation,
  EditLocationIn,
  FindAddressPlace,
  ListLocations,
  ListLocationsOut,
  LocationOut,
  SuggestAddresses,
  SuggestAddressesOut,
} from '@rochas-surf-school/classes';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { NotificationsLocationChangeNotifier } from '../notifications/notifications.location-change-notifier.js';
import { GooglePlacesAddressSuggestionProvider } from './google-places.address-suggestions.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { SystemClockProvider } from './system.clock.js';

type LocationBody =
  | Partial<Pick<CreateLocationIn, 'name' | 'address' | 'latitude' | 'longitude'>>
  | undefined;
type EditLocationBody = (LocationBody & Partial<Pick<EditLocationIn, 'notify'>>) | undefined;

function actorOf(user: AuthenticatedUser): ClassActor {
  return { id: user.id, role: user.role, status: user.status };
}

@Controller('locations')
export class LocationsController {
  constructor(
    private readonly locationRepository: PrismaLocationRepository,
    private readonly clock: SystemClockProvider,
    private readonly locationChangeNotifier: NotificationsLocationChangeNotifier,
    private readonly addressSuggestionProvider: GooglePlacesAddressSuggestionProvider,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(@CurrentUser() user: AuthenticatedUser): Promise<ListLocationsOut> {
    return new ListLocations(this.locationRepository, this.clock).execute({
      actor: actorOf(user),
    });
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: LocationBody,
  ): Promise<LocationOut> {
    return new CreateLocation(this.locationRepository).execute({
      actor: actorOf(user),
      name: body?.name,
      address: body?.address,
      latitude: body?.latitude,
      longitude: body?.longitude,
    });
  }

  // The suggestion routes come before the `:id` ones, so "address-suggestions" is never read as an id.
  @Get('address-suggestions')
  @HttpCode(HttpStatus.OK)
  suggestions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('q') q?: unknown,
    @Query('sessionToken') sessionToken?: unknown,
    @Query('language') language?: unknown,
  ): Promise<SuggestAddressesOut> {
    return new SuggestAddresses(this.addressSuggestionProvider).execute({
      actor: actorOf(user),
      query: q,
      sessionToken,
      language,
    });
  }

  @Get('address-suggestions/:placeId')
  @HttpCode(HttpStatus.OK)
  place(
    @CurrentUser() user: AuthenticatedUser,
    @Param('placeId') placeId: string,
    @Query('sessionToken') sessionToken?: unknown,
    @Query('language') language?: unknown,
  ): Promise<AddressPlace> {
    return new FindAddressPlace(this.addressSuggestionProvider).execute({
      actor: actorOf(user),
      placeId,
      sessionToken,
      language,
    });
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  edit(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body?: EditLocationBody,
  ): Promise<LocationOut> {
    return new EditLocation(this.locationRepository, this.locationChangeNotifier, this.clock).execute({
      actor: actorOf(user),
      id,
      name: body?.name,
      address: body?.address,
      latitude: body?.latitude,
      longitude: body?.longitude,
      notify: body?.notify,
    });
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string): Promise<void> {
    return new ArchiveLocation(this.locationRepository).execute({ actor: actorOf(user), id });
  }
}
