import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RESPONSE_SERVICE } from 'src/common/response_service/interface/response.interface';
import {
  FIREBASE_ADMIN_PROVIDER,
  IFirebaseAdminProvider,
} from 'src/common/firebase/application/interfaces/firebase.interface';
import { appCheck } from 'firebase-admin';
import { ENVIRONMENT } from 'src/common/base/enum/common.enum';
import { ResponseService } from 'src/common/response_service/service/response.service';
import { VerifyAppCheckTokenResponse } from 'firebase-admin/lib/app-check/app-check-api';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppCheckGuard implements CanActivate {
  private readonly appCheck: appCheck.AppCheck;

  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    @Inject(FIREBASE_ADMIN_PROVIDER)
    firebaseApps: IFirebaseAdminProvider,
    private readonly configService: ConfigService,
    private reflector: Reflector,
  ) {
    this.appCheck = firebaseApps.default.admin.appCheck();
    this.responseService.setContext(AppCheckGuard.name);
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    if (this.isDevelopmentEnvironment()) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const appCheckToken = this.extractAppCheckToken(request);

    return await this.validateAppCheckToken(appCheckToken, request);
  }

  private isDevelopmentEnvironment(): boolean {
    return (
      this.configService.get<string>('NODE_ENV') === ENVIRONMENT.DEVELOPMENT
    );
  }

  private extractAppCheckToken(request: Request): string {
    const token = request.header('X-Firebase-AppCheck');
    if (!token) {
      throw new UnauthorizedException('App Check token is missing');
    }
    return token;
  }

  private async validateAppCheckToken(
    token: string,
    request: Request,
  ): Promise<boolean> {
    try {
      const appCheckClaims: VerifyAppCheckTokenResponse =
        await this.appCheck.verifyToken(token);
      request['appCheckClaims'] = appCheckClaims;
      return true;
    } catch (error) {
      this.responseService.errorHandler({ error });
      throw new UnauthorizedException('Invalid App Check token');
    }
  }
}
