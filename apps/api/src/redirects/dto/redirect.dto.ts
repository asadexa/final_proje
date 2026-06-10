import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString } from 'class-validator';

export class CreateRedirectDto {
  @ApiProperty({ example: '/eski-pam' })
  @IsString()
  source!: string;

  @ApiProperty({ example: '/tr/kron-pam' })
  @IsString()
  destination!: string;

  @ApiPropertyOptional({ default: 301, enum: [301, 302] })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsIn([301, 302])
  statusCode?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateRedirectDto extends PartialType(CreateRedirectDto) {}
