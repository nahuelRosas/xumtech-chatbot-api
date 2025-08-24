import { Inject, Injectable } from '@nestjs/common';
import { ConfigService as NestConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Configuration } from '../interface/envconfig.interface';
import { RESPONSE_SERVICE } from 'src/common/response_service/interface/response.interface';
import { ResponseService } from 'src/common/response_service/service/response.service';
import { BaseService } from 'src/common/base/application/service/base.service';

@Injectable()
export class EnvConfigService extends BaseService {
  private readonly applicationSettings: Configuration;

  constructor(
    @Inject(RESPONSE_SERVICE)
    private readonly responseService: ResponseService,
    private readonly configurationService: NestConfigService,
  ) {
    super();
    this.applicationSettings = this.initializeConfiguration();
  }

  private initializeConfiguration(): Configuration {
    try {
      const environmentConfiguration: Configuration = {};
      const configurationSchema = z.object({
        ENV64_CONFIG: z.string().min(1, 'ENV64_CONFIG cannot be empty'),
      });

      configurationSchema.safeParse(process.env);

      const encodedEnvConfiguration =
        this.configurationService.get<string>('ENV64_CONFIG');
      if (encodedEnvConfiguration) {
        const decodedEnvironmentConfig = this.decodeBase64String(
          encodedEnvConfiguration,
        );
        const parsedEnvironmentConfiguration = this.extractEnvConfiguration(
          decodedEnvironmentConfig,
        );
        Object.assign(environmentConfiguration, parsedEnvironmentConfiguration);
      }
      return environmentConfiguration;
    } catch (error) {
      this.responseService.errorHandler({ error });
    }
  }

  private extractEnvConfiguration(
    environmentConfigString: string,
  ): Record<string, string> {
    const lineArray = environmentConfigString.split('\n');
    const parsedServiceConfiguration: Record<string, string> = {};

    for (const line of lineArray) {
      const index = line.indexOf('=');

      if (index > 0 && index < line.length - 1) {
        const key = line.slice(0, index).trim();
        const value = line.slice(index + 1).trim();
        parsedServiceConfiguration[key] = value;
      }
    }

    return parsedServiceConfiguration;
  }

  public retrieveSetting<T>(key: string): T | undefined {
    return this.applicationSettings[key] as T;
  }

  public retrieveAllConfigurations(): Configuration {
    return this.applicationSettings;
  }

  public getApplicationSettings(): object {
    return { ...this.applicationSettings };
  }

  public retrieveFirebaseApps(): string[] {
    const FirebaseSchema = z.object({
      FIREBASE_APP: z.string().min(1, 'FIREBASE_APP cannot be empty'),
    });

    const parsedConfig = FirebaseSchema.parse({
      FIREBASE_APP: this.applicationSettings['FIREBASE_APP'],
    });

    return parsedConfig.FIREBASE_APP.split(',');
  }

  public retrieveFirebaseAppByName(appName: string): string | undefined {
    const FirebaseSchema = z.object({
      FIREBASE_APP: z.string().min(1, 'FIREBASE_APP cannot be empty'),
    });

    const parsedConfig = FirebaseSchema.parse({
      FIREBASE_APP: this.applicationSettings['FIREBASE_APP'],
    });

    const firebaseApps = parsedConfig.FIREBASE_APP.split(',');
    return firebaseApps.find((app) => app === appName);
  }
}
