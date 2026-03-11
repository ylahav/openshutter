import { IsOptional, IsObject, IsString } from 'class-validator';

/** Contact overrides: email?, socialMedia? */
export class OwnerContactPropsDto {
  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsObject()
  socialMedia?: Record<string, string>;
}
