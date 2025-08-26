import { Global, Module } from '@nestjs/common';
import { RESPONSE_SERVICE } from './response_service/interface/response.interface';
import { ResponseService } from './response_service/service/response.service';
import { APP_FILTER } from '@nestjs/core';
import { APP_GUARD } from '@nestjs/core';
import { AllExceptionsFilter } from './response_service/filter/all_exceptions.filter';
import { ConfigModule } from '@nestjs/config';
import { EnvConfigService } from './env_config/service/envconfig.service';
import { GlobalDateLockGuard } from './guards/global-date-lock.guard';
import { APP_ENVIRONMENT_SERVICE } from './env_config/interface/envconfig.interface';
import createFirebaseApp from './firebase/application/factory/firebase.factory';
import {
  FIREBASE_SERVICE,
  FIREBASE_ADMIN_PROVIDER,
  IFirebaseAdminProvider,
} from './firebase/application/interfaces/firebase.interface';
import { FIRESTORE_REPOSITORY } from './firebase/application/interfaces/firestore.repository.interface';
import { FirebaseService } from './firebase/application/service/firebase.service';
import { FirestoreRepository } from './firebase/repository/firestore.repository';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      cache: true,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: APP_ENVIRONMENT_SERVICE,
      useClass: EnvConfigService,
    },
    {
      provide: RESPONSE_SERVICE,
      useClass: ResponseService,
    },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_GUARD,
      useClass: GlobalDateLockGuard,
    },
    {
      provide: FIRESTORE_REPOSITORY,
      useClass: FirestoreRepository,
    },
    {
      provide: FIREBASE_SERVICE,
      useClass: FirebaseService,
    },
    {
      provide: FIREBASE_ADMIN_PROVIDER,
      inject: [APP_ENVIRONMENT_SERVICE, FIREBASE_SERVICE, RESPONSE_SERVICE],
      useFactory: (
        environmentConfigService: EnvConfigService,
        firebaseProjectService: FirebaseService,
        responseService: ResponseService,
      ): IFirebaseAdminProvider => {
        const firebaseApps: IFirebaseAdminProvider = {};
        Object.values(environmentConfigService.retrieveFirebaseApps()).forEach(
          (appName) => {
            firebaseApps[appName] = createFirebaseApp({
              environmentConfigService: environmentConfigService,
              name: appName,
              firebaseProjectService,
              responseService,
            });
          },
        );
        return firebaseApps;
      },
    },
  ],
  exports: [
    APP_ENVIRONMENT_SERVICE,
    FIREBASE_ADMIN_PROVIDER,
    FIRESTORE_REPOSITORY,
    FIREBASE_SERVICE,
    RESPONSE_SERVICE,
  ],
})
export class CommonModule {}
