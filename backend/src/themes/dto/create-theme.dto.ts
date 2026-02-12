import { IsString, IsOptional, IsObject, IsIn } from 'class-validator';

export class CreateThemeDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsIn(['default', 'minimal', 'elegant', 'modern'])
  baseTemplate: string;

  @IsOptional()
  @IsString()
  @IsIn(['light', 'dark', 'highContrast', 'muted'])
  basePalette?: string;

  @IsOptional()
  @IsObject()
  customColors?: Record<string, string>;

  @IsOptional()
  @IsObject()
  customFonts?: Record<string, string>;

  @IsOptional()
  @IsObject()
  customLayout?: Record<string, string>;

  @IsOptional()
  @IsObject()
  componentVisibility?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  headerConfig?: Record<string, unknown>;
}
