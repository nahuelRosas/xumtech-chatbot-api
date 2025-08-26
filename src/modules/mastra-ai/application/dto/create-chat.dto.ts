import { IsString, IsUUID } from 'class-validator';

export class CreateChatDto {
  @IsString()
  message: string;

  @IsUUID()
  conversationId: string;
}
