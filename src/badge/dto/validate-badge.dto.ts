// backend/src/badge/dto/validate-badge.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class ValidateBadgeDto {
  @IsNotEmpty()
  @IsString()
  badgeCode: string;
}