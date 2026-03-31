import { Allow, IsBoolean, IsOptional, IsString } from 'class-validator';

/** PUT /api/admin/blog-articles/:id */
export class UpdateBlogArticleAdminDto {
  @Allow()
  @IsOptional()
  title?: Record<string, string> | string;

  @IsString()
  @IsOptional()
  category?: string;

  @Allow()
  @IsOptional()
  tags?: unknown;

  @Allow()
  @IsOptional()
  content?: Record<string, string> | string;

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
