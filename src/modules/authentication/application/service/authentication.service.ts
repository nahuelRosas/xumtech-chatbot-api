import {
  Injectable,
  Inject,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { auth } from 'firebase-admin';
import { FirebaseService } from 'src/common/firebase/application/service/firebase.service';
import {
  FIREBASE_ADMIN_PROVIDER,
  FIREBASE_SERVICE,
  IFirebaseAdminProvider,
} from 'src/common/firebase/application/interfaces/firebase.interface';
import { RESPONSE_SERVICE } from 'src/common/response_service/interface/response.interface';
import { ResponseService } from 'src/common/response_service/service/response.service';
import {
  AuthErrorMessages,
  PROJECT_EXTRACTION_REGEX,
} from '../constants/auth-errors.const';
import { FirebaseError, TokenValidationResponse } from '../types/auth.types';

export const AUTHENTICATION_SERVICE = 'AUTHENTICATION_SERVICE';
@Injectable()
export class AuthenticationService {
  private auth: auth.Auth;

  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    @Inject(FIREBASE_ADMIN_PROVIDER)
    private readonly firebaseApp: IFirebaseAdminProvider,
    @Inject(FIREBASE_SERVICE)
    private readonly firebaseProjectService: FirebaseService,
  ) {
    this.responseService.setContext(AuthenticationService.name);
    this.auth = this.firebaseApp.default.admin.auth();
  }

  public async validateToken(
    idToken: string,
  ): Promise<TokenValidationResponse> {
    try {
      const decodedToken = await this.auth.verifyIdToken(idToken);
      return this.createValidTokenResponse(decodedToken);
    } catch (error) {
      return this.handleTokenVerificationError(error as FirebaseError, idToken);
    }
  }

  private async handleTokenVerificationError(
    error: FirebaseError,
    idToken: string,
  ): Promise<TokenValidationResponse> {
    const errorMessage = error.errorInfo?.message;

    if (errorMessage?.includes(AuthErrorMessages.INVALID_ISS)) {
      return this.verifySessionCookie(idToken);
    }

    if (errorMessage?.includes(AuthErrorMessages.INVALID_AUD)) {
      return this.handleIncorrectAudience(error, idToken);
    }

    this.throwTokenError(errorMessage);
  }

  private async verifySessionCookie(
    idToken: string,
  ): Promise<TokenValidationResponse> {
    try {
      const decodedSessionCookie = await this.auth.verifySessionCookie(idToken);
      return this.createValidTokenResponse(decodedSessionCookie);
    } catch (error) {
      this.responseService.errorHandler({ error });
      throw new UnauthorizedException(AuthErrorMessages.INVALID_SESSION_COOKIE);
    }
  }

  private async handleIncorrectAudience(
    error: FirebaseError,
    idToken: string,
  ): Promise<TokenValidationResponse> {
    const expectedProject = this.extractExpectedProject(
      error.errorInfo?.message || '',
    );

    if (!expectedProject) {
      throw new BadRequestException(
        AuthErrorMessages.PROJECT_EXTRACTION_FAILED,
      );
    }

    return this.switchProjectAndValidate(expectedProject, idToken);
  }

  private async switchProjectAndValidate(
    expectedProject: string,
    idToken: string,
  ): Promise<TokenValidationResponse> {
    const firebaseProjectKey = this.firebaseProjectService
      .getProjectName(expectedProject)
      .toLowerCase();

    const projectApp = this.firebaseApp[firebaseProjectKey];
    if (!projectApp) {
      throw new NotFoundException(
        `Project ${firebaseProjectKey} not found in firebaseApp`,
      );
    }

    this.auth = projectApp.admin.auth();

    try {
      const decodedToken = await this.auth.verifySessionCookie(idToken);
      return this.createValidTokenResponse(decodedToken);
    } catch (error) {
      this.responseService.errorHandler({ error });
      throw new UnauthorizedException(
        AuthErrorMessages.TOKEN_VALIDATION_FAILED,
      );
    }
  }

  private createValidTokenResponse(
    decodedToken: auth.DecodedIdToken,
  ): TokenValidationResponse {
    return this.responseService.createResponse({
      message: 'Valid token',
      payload: decodedToken,
      type: 'ACCEPTED',
    });
  }

  private extractExpectedProject(errorMessage: string): string | null {
    const match = PROJECT_EXTRACTION_REGEX.exec(errorMessage);
    return match?.[1] || null;
  }

  private throwTokenError(errorMessage: string | undefined): never {
    if (errorMessage === AuthErrorMessages.TOKEN_EXPIRED) {
      throw new UnauthorizedException(AuthErrorMessages.TOKEN_EXPIRED_USER);
    }

    throw new UnauthorizedException(
      errorMessage || AuthErrorMessages.INVALID_TOKEN,
    );
  }
}
