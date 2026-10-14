import { Module } from '@nestjs/common';
import { ClassesController } from './classes.controller.js';

@Module({
  controllers: [ClassesController],
})
export class ClassesModule {}
