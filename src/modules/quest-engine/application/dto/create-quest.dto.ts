import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateQuestDto {
  @IsNotEmpty()
  @IsString()
  question: string;

  @IsOptional()
  @IsString()
  answer?: string;

  @IsOptional()
  @IsUUID()
  uid?: string;
}
