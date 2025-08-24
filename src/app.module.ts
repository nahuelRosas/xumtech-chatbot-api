import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { AuthenticationModule } from './modules/authentication/authentication.module';
import { QuestEngineModule } from './modules/quest-engine/quest-engine.module';
import { MastraModule } from './modules/mastra-ai/mastra.module';

@Module({
  imports: [
    CommonModule,
    AuthenticationModule,
    QuestEngineModule,
    MastraModule.forRootAsync(),
  ],
})
export class AppModule {}
