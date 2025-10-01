import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { QuestEngineService } from '../application/service/quest-engine.service';
import { AuthenticationGuard } from 'src/modules/authentication/guards/authentication.guard';
import { CreateQuestDto } from '../application/dto/create-quest.dto';
import { UpdateQuestDto } from '../application/dto/update-quest.dto';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseGuards(AuthenticationGuard)
@ApiTags('quests')
@Controller('quests')
export class QuestEngineController {
  constructor(private readonly questEngineService: QuestEngineService) {}

  @Get()
  @ApiOperation({ summary: 'Retrieve all quests' })
  @ApiResponse({ status: 200, description: 'Quests retrieved successfully' })
  async getAllQuests() {
    return this.questEngineService.getAllQuests();
  }

  @Post()
  @ApiOperation({ summary: 'Create one or many quests' })
  @ApiBody({ type: [CreateQuestDto] })
  @ApiResponse({ status: 201, description: 'Quest(s) created successfully' })
  async createQuests(@Body() payload: CreateQuestDto | CreateQuestDto[]) {
    return this.questEngineService.createQuests(payload);
  }

  @Patch(':uid')
  @ApiOperation({ summary: 'Edit a quest by uid' })
  @ApiBody({ type: UpdateQuestDto })
  @ApiResponse({ status: 200, description: 'Quest updated successfully' })
  async editQuest(
    @Param('uid', new ParseUUIDPipe()) uid: string,
    @Body() payload: UpdateQuestDto,
  ) {
    return this.questEngineService.editQuest(uid, payload);
  }

  @Delete(':uid')
  @ApiOperation({ summary: 'Delete a quest by uid' })
  @ApiResponse({ status: 200, description: 'Quest deleted successfully' })
  async deleteQuest(@Param('uid', new ParseUUIDPipe()) uid: string) {
    return this.questEngineService.deleteQuest(uid);
  }
}
