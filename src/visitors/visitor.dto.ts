import { IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateVisitorDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  company: string;

  @IsNotEmpty()
  @IsString()
  purpose: string;

  @IsNotEmpty()
  @IsString()
  date: string;

  @IsNotEmpty()
  @IsString()
  time: string;

  @IsNotEmpty()
  @IsString()
  contactPerson: string;

  @IsOptional()
  @IsString()
  badgeUrl?: string;

  @IsOptional()
  @IsBoolean()
  notificationSent?: boolean;
}
