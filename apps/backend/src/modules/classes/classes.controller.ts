import { Controller, Get } from '@nestjs/common';

@Controller('classes')
export class ClassesController {
  @Get('/')
  getClasses() {
    return { message: 'Classes endpoint' };
  }
}
