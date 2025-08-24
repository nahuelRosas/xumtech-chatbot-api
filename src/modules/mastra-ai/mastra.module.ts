import { DynamicModule, Module } from '@nestjs/common';
import { MASTRA } from './application/config/mastra.constants';
import {
  GEMINI_CLIENT,
  createGeminiClient,
} from './application/config/model.config';
import { MastraController } from './controller/mastra.controller';
import { MastraService } from './application/service/mastra.service';
import { QuestEngineModule } from 'src/modules/quest-engine/quest-engine.module';
import { Mastra } from '@mastra/core/mastra';
import { LibSQLStore } from '@mastra/libsql';
import { createQuestAgent } from './application/agents/quest-agent';
import { APP_ENVIRONMENT_SERVICE } from 'src/common/env_config/interface/envconfig.interface';
import { EnvConfigService } from 'src/common/env_config/service/envconfig.service';
import { GoogleGenerativeAIProvider } from '@ai-sdk/google';

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
          inject: [APP_ENVIRONMENT_SERVICE, GEMINI_CLIENT],
          useFactory: (
            environmentConfigService: EnvConfigService,
            geminiClient: GoogleGenerativeAIProvider,
          ) => {
            const model = geminiClient('gemini-2.5-flash-lite');
            const questAgent = createQuestAgent(model);
            return new Mastra({
              agents: { questAgent },
              telemetry: {
                enabled: false,
              },
              storage: new LibSQLStore({
                url:
                  environmentConfigService.retrieveSetting<string>(
                    'MASTRA_DB_URL',
                  ) || ':memory:',
              }),
            });
          },
        },
        MastraService,
      ],
      exports: [MASTRA, MastraService, GEMINI_CLIENT],
      controllers: [MastraController],
    };
  }
}
