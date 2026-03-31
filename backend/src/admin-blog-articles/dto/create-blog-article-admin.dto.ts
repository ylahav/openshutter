import { Allow, IsBoolean, IsOptional, IsString } from 'class-validator';

/**
 * POST /api/admin/blog-articles
 * Whitelist-friendly: multilingual fields use @Allow() so nested objects are not stripped.
 */
export class CreateBlogArticleAdminDto {
  @Allow()
  title!: Record<string, string> | string;

  @IsString()
  category!: string;

  @Allow()
  @IsOptional()
  tags?: unknown;

  @Allow()
  content!: Record<string, string> | string;

  @Allow()
  @IsOptional()
  excerpt?: unknown;

  @Allow()
  @IsOptional()
  leadingImage?: unknown;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @Allow()
  @IsOptional()
  seoTitle?: unknown;

  @Allow()
  @IsOptional()
  seoDescription?: unknown;

  @IsString()
  @IsOptional()
  slug?: string;
}
