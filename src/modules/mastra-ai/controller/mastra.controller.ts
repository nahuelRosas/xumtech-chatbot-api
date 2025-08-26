import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MastraService } from '../application/service/mastra.service';
import { CreateChatDto } from '../application/dto/create-chat.dto';
import { IResponse } from 'src/common/response_service/interface/response.interface';
import { AppCheckGuard } from 'src/modules/authentication/guards/app-check.guard';
import { AuthenticationGuard } from 'src/modules/authentication/guards/authentication.guard';
import { UserUUID } from 'src/modules/authentication/decorators/user-uuid.decorator';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@UseGuards(AppCheckGuard, AuthenticationGuard)
@ApiTags('mastra')
@Controller('mastra')
export class MastraController {
  constructor(private readonly mastraService: MastraService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Send a chat message to Mastra agent' })
  @ApiBody({ type: CreateChatDto })
  @ApiResponse({
    status: 200,
    description: 'Chat response',
    schema: { example: { data: { answer: 'string' } } },
  })
  async chat(
    @UserUUID() uuid: string,
    @Body() dto: CreateChatDto,
  ): Promise<
    IResponse<{
      answer: string;
    }>
  > {
    return await this.mastraService.chatWithAgent(dto, uuid);
  }
}
