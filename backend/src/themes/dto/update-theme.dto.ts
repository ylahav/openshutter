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
  customFonts?: Record<string, string | { family?: string; size?: string; weight?: string }>;

  @IsOptional()
  @IsObject()
  customLayout?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  componentVisibility?: Record<string, boolean>;

  @IsOptional()
  @IsObject()
  headerConfig?: Record<string, unknown>;

  /** Per-page modules: legacy flat arrays or breakpoint map per page. */
  @IsOptional()
  @IsObject()
  pageModules?: Record<string, unknown>;

  /** Per-page grid: legacy flat grids or breakpoint map per page. */
  @IsOptional()
  @IsObject()
  pageLayout?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  customLayoutByBreakpoint?: Record<string, Record<string, string>>;

  @IsOptional()
  @IsObject()
  pageLayoutByBreakpoint?: Record<string, Record<string, { gridRows?: number; gridColumns?: number }>>;

  @IsOptional()
  @IsObject()
  pageModulesByBreakpoint?: Record<string, Record<string, unknown[]>>;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
