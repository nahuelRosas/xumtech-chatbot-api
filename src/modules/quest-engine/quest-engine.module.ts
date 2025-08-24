import { Module } from '@nestjs/common';
import { QuestEngineService } from './application/service/quest-engine.service';
import { QuestEngineController } from './controllers/quest-engine.controller';

@Module({
  controllers: [QuestEngineController],
  providers: [QuestEngineService],
  exports: [QuestEngineService],
})
export class QuestEngineModule {}
