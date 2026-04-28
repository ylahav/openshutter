import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateContactSubmissionDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsEmail()
  @MaxLength(320)
  email!: string;

  @IsString()
  @MaxLength(4000)
  message!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  pageAlias?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  sourceUrl?: string;
}
