import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ListPeople, ListPeopleOut } from '@rochas-surf-school/auth';
import { CurrentUser } from '../../shared/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../../shared/types/current-user.type.js';
import { PrismaUserRepository } from './user.prisma.js';

@Controller('people')
export class PeopleController {
  constructor(private readonly userRepository: PrismaUserRepository) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
    @Query('role') role?: string,
    @Query('search') search?: string,
    @Query('sort') sort?: string,
  ): Promise<ListPeopleOut> {
    return new ListPeople(this.userRepository).execute({
      actor: { id: user.id, role: user.role, status: user.status },
      page,
      perPage,
      role,
      search,
      sort,
    });
  }
}
