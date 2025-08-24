import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';
import { FirebaseService } from '../service/firebase.service';
import { ResponseService } from 'src/common/response_service/service/response.service';
import * as admin from 'firebase-admin';
import { FirebaseApp } from 'firebase/app';

export const FIREBASE_ADMIN_PROVIDER = 'FIREBASE_ADMIN_PROVIDER';
export const FIREBASE_SERVICE = 'FIREBASE_SERVICE';

export interface IFactoryFirebaseApp {
  environmentConfigService: EnvConfigService;
  name: string;
  firebaseProjectService: FirebaseService;
  responseService: ResponseService;
}

export interface IFirebaseAdminProvider {
  [x: string]: {
    admin: admin.app.App;
    client: FirebaseApp;
    credentials: {
      projectId: string;
      client_email: string;
      private_key: string;
    };
  };
}
