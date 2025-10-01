import { Global, Module } from '@nestjs/common';
import {
  AUTHENTICATION_SERVICE,
  AuthenticationService,
} from './application/service/authentication.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthenticationGuard } from './guards/authentication.guard';

@Global()
@Module({
  providers: [
    {
      provide: AUTHENTICATION_SERVICE,
      useClass: AuthenticationService,
    },
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: [AUTHENTICATION_SERVICE],
})
export class AuthenticationModule {}
