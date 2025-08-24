import { auth } from 'firebase-admin';
import { IResponse } from 'src/common/response_service/interface/response.interface';

export interface FirebaseError {
  errorInfo?: {
    message: string;
  };
}

export type TokenValidationResponse = IResponse<auth.DecodedIdToken>;

export interface ProjectAuthConfig {
  admin: auth.Auth;
  projectKey: string;
}
