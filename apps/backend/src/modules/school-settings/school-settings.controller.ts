import { Controller, Get } from '@nestjs/common';

@Controller('school-settings')
export class SchoolSettingsController {
  @Get('/')
  getSchoolSettings() {
    return { message: 'SchoolSettings endpoint' };
  }
}
