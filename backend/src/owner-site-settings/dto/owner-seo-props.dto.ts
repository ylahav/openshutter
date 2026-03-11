import { IsOptional, IsObject } from 'class-validator';

/** SEO overrides: metaTitle?, metaDescription? (multi-lang objects). */
export class OwnerSeoPropsDto {
  @IsOptional()
  @IsObject()
  metaTitle?: Record<string, string>;

  @IsOptional()
  @IsObject()
  metaDescription?: Record<string, string>;
}
