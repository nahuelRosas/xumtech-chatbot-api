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
  AUTHENTICATION_SERVICE,
  AuthenticationService,
} from '../application/service/authentication.service';
import { ResponseService } from 'src/common/response_service/service/response.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    @Inject(AUTHENTICATION_SERVICE)
    private readonly firebaseAuthService: AuthenticationService,
    private reflector: Reflector,
  ) {
    this.responseService.setContext(AuthenticationGuard.name);
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    return await this.validateAuthenticationToken(token, request);
  }

  private extractTokenFromHeader(request: Request): string {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authentication token is missing');
    }
    return authHeader.split(' ')[1];
  }

  private async validateAuthenticationToken(
    token: string,
    request: Request,
  ): Promise<boolean> {
    try {
      const decodedToken = await this.firebaseAuthService.validateToken(token);

      request['user'] = decodedToken.payload;

      return true;
    } catch (error) {
      this.responseService.errorHandler({ error });
      throw new UnauthorizedException('Invalid authentication token');
    }
  }
}
