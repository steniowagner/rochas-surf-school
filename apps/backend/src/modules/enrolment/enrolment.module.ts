import { Module } from '@nestjs/common';
import { EnrolmentController } from './enrolment.controller.js';

@Module({
  controllers: [EnrolmentController],
})
export class EnrolmentModule {}
