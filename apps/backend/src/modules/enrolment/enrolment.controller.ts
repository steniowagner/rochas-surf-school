import { Controller, Get } from '@nestjs/common';

@Controller('enrolment')
export class EnrolmentController {
  @Get('/')
  getEnrolment() {
    return { message: 'Enrolment endpoint' };
  }
}
