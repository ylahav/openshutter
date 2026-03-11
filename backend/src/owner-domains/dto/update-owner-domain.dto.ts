import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateOwnerDomainDto {
  @IsString()
  @IsOptional()
  hostname?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

