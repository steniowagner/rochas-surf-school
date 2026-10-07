import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { DbModule } from './db/db.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthModule } from './shared/auth/jwt-auth.module.js';
import { JwtAuthGuard } from './shared/auth/jwt-auth.guard.js';
import { ApiExceptionFilter } from './shared/errors/api-exception.filter.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbModule,
    JwtAuthModule,
    AuthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
