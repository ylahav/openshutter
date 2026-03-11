import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateOwnerDomainDto {
  @IsString()
  hostname!: string;

  @IsString()
  ownerId!: string;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;
}

