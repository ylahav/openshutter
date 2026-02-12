import { IsString, IsOptional, IsObject, IsIn, IsBoolean } from 'class-validator';

export class UpdateThemeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  @IsIn(['default', 'minimal', 'elegant', 'modern'])
  baseTemplate?: string;

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

  /** Per-page modules: { home: [...], gallery: [...], album: [...], search: [...], header: [...], footer: [...] } */
  @IsOptional()
  @IsObject()
  pageModules?: Record<string, any[]>;

  /** Per-page grid layout: { home: { gridRows: 3, gridColumns: 1 }, ... } */
  @IsOptional()
  @IsObject()
  pageLayout?: Record<string, { gridRows?: number; gridColumns?: number }>;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
