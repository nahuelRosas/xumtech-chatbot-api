import { DynamicModule, Module } from '@nestjs/common';
import { MASTRA } from './application/config/mastra.constants';
import {
  GEMINI_CLIENT,
  createGeminiClient,
} from './application/config/model.config';
import { MastraController } from './controller/mastra.controller';
import { MastraService } from './application/service/mastra.service';
import { QuestEngineModule } from 'src/modules/quest-engine/quest-engine.module';
import { createMastra } from './application/factory/mastra.factory';
import { APP_ENVIRONMENT_SERVICE } from 'src/common/env_config/interface/envconfig.interface';
import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';
import { GoogleGenerativeAIProvider } from '@ai-sdk/google';
import { ResponseService } from 'src/common/response_service/service/response.service';
import { RESPONSE_SERVICE } from 'src/common/response_service/interface/response.interface';

@Module({})
export class MastraModule {
  static forRootAsync(): DynamicModule {
    return {
      module: MastraModule,
      imports: [QuestEngineModule],
      providers: [
        {
          provide: GEMINI_CLIENT,
          inject: [APP_ENVIRONMENT_SERVICE],
          useFactory: (environmentConfigService: EnvConfigService) =>
            createGeminiClient(environmentConfigService),
        },
        {
          provide: MASTRA,
          inject: [APP_ENVIRONMENT_SERVICE, GEMINI_CLIENT, RESPONSE_SERVICE],
          useFactory: (
            environmentConfigService: EnvConfigService,
            geminiClient: GoogleGenerativeAIProvider,
            responseService: ResponseService,
          ) =>
            createMastra(
              environmentConfigService,
              geminiClient,
              responseService,
            ),
        },
        MastraService,
      ],
      exports: [MASTRA, MastraService, GEMINI_CLIENT],
      controllers: [MastraController],
    };
  }
}
