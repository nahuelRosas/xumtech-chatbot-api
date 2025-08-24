import { Body, Controller, Post } from '@nestjs/common';
import { MastraService } from '../application/service/mastra.service';
import { CreateChatDto } from '../application/dto/create-chat.dto';

@Controller('mastra')
export class MastraController {
  constructor(private readonly mastraService: MastraService) {}

  @Post('chat')
  async chat(@Body() dto: CreateChatDto) {
    return await this.mastraService.chatWithAgent(dto);
  }
}
