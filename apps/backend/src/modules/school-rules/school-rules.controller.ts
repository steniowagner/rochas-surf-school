import { Controller, Get } from '@nestjs/common';

@Controller('school-rules')
export class SchoolRulesController {
  @Get('/')
  getSchoolRules() {
    return { message: 'SchoolRules endpoint' };
  }
}
