import { Module } from '@nestjs/common';
import { DbModule } from '../../db/db.module.js';
import { PrismaLocationRepository } from './location.prisma.js';
import { LocationsController } from './locations.controller.js';

@Module({
  imports: [DbModule],
  controllers: [LocationsController],
  providers: [PrismaLocationRepository],
})
export class ClassesModule {}
