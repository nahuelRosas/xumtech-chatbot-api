import { IsOptional, IsString } from 'class-validator';

export class UpdateQuestDto {
  @IsOptional()
  @IsString()
  question?: string;

  @IsOptional()
  @IsString()
  answer?: string;
}
