import { IsOptional, IsObject, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { OwnerHeroPropsDto } from './owner-hero-props.dto';
import { OwnerSeoPropsDto } from './owner-seo-props.dto';
import { OwnerContactPropsDto } from './owner-contact-props.dto';
import { OwnerFooterPropsDto } from './owner-footer-props.dto';

/**
 * Hero module props for owner mini-site home page (optional override).
 */
export interface OwnerHeroProps {
  title?: Record<string, string>;
  subtitle?: Record<string, string>;
  ctaLabel?: Record<string, string>;
  ctaUrl?: string;
  backgroundStyle?: string;
  backgroundImage?: string;
}

/**
 * Owner site settings — all optional overrides for the owner's domain.
 * Stored in owner_site_settings; merged into GET /api/site-config when request is owner-site.
 */
export class UpdateOwnerSiteSettingsDto {
  @IsOptional()
  @IsObject()
  siteName?: Record<string, string>;

  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  favicon?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerHeroPropsDto)
  hero?: OwnerHeroPropsDto;

  /** SEO overrides: metaTitle?, metaDescription? (multi-lang objects) */
  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerSeoPropsDto)
  seo?: OwnerSeoPropsDto;

  /** Contact overrides: email?, socialMedia? */
  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerContactPropsDto)
  contact?: OwnerContactPropsDto;

  /** Footer overrides: copyrightText?, termsUrl?, privacyUrl? */
  @IsOptional()
  @ValidateNested()
  @Type(() => OwnerFooterPropsDto)
  footer?: OwnerFooterPropsDto;

  /** Template overrides: pageLayout?, pageModules?, headerConfig? (same shape as site_config.template) */
  @IsOptional()
  @IsObject()
  template?: Record<string, unknown>;
}
