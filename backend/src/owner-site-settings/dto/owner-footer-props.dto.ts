import { IsOptional, IsString } from 'class-validator';

/** Footer overrides: copyrightText?, termsUrl?, privacyUrl? */
export class OwnerFooterPropsDto {
  @IsOptional()
  @IsString()
  copyrightText?: string;

  @IsOptional()
  @IsString()
  termsUrl?: string;

  @IsOptional()
  @IsString()
  privacyUrl?: string;
}
