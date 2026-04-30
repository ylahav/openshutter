import { IsOptional, IsObject, IsString } from 'class-validator';

/**
 * Nested DTO so ValidationPipe (whitelist) keeps all hero fields when PATCH is sent.
 */
export class OwnerHeroPropsDto {
  @IsOptional()
  @IsObject()
  title?: Record<string, string>;

  @IsOptional()
  @IsObject()
  subtitle?: Record<string, string>;

  @IsOptional()
  @IsObject()
  ctaLabel?: Record<string, string>;

  @IsOptional()
  @IsString()
  ctaUrl?: string;

  @IsOptional()
  @IsString()
  backgroundStyle?: string;

  @IsOptional()
  @IsString()
  backgroundImage?: string;

  @IsOptional()
  @IsString()
  heroLayout?: string;

  @IsOptional()
  @IsString()
  heroSplitLead?: string;

  @IsOptional()
  @IsString()
  heroSplitGridColumns?: string;

  @IsOptional()
  @IsString()
  heroSplitMinHeight?: string;

  @IsOptional()
  @IsString()
  heroSplitMediaMinHeight?: string;
}
