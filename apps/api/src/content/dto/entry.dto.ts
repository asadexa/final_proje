import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  BLOCK_TYPES,
  ENTRY_STATUSES,
  ENTRY_TYPES,
  type BlockType,
  type EntryStatus,
  type EntryType,
} from '@kron/shared';

export class BlockDto {
  @ApiProperty({ enum: BLOCK_TYPES })
  @IsIn(BLOCK_TYPES)
  type!: BlockType;

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  order!: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiProperty({
    type: Object,
    description: 'Blok tipine gore data (Zod ile dogrulanir)',
  })
  @IsObject()
  data!: Record<string, unknown>;
}

export class SeoDto {
  @ApiPropertyOptional() @IsOptional() @IsString() metaTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() metaDescription?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() canonicalUrl?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsIndex?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() robotsFollow?: boolean;
  @ApiPropertyOptional() @IsOptional() @IsString() ogTitle?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() ogDescription?: string;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];
}

export class CreateEntryDto {
  @ApiProperty({ enum: ENTRY_TYPES })
  @IsIn(ENTRY_TYPES)
  type!: EntryType;

  @ApiProperty({ example: 'tr' })
  @IsString()
  localeCode!: string;

  @ApiProperty({ example: 'kron-pam' })
  @IsString()
  slug!: string;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Blog Highlights sidebar secimi' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ enum: ENTRY_STATUSES })
  @IsOptional()
  @IsIn(ENTRY_STATUSES)
  status?: EntryStatus;

  @ApiPropertyOptional({ description: 'Mevcut ceviri grubuna baglamak icin' })
  @IsOptional()
  @IsString()
  groupId?: string;

  @ApiPropertyOptional({ description: 'Zamanlanmis yayin tarihi (ISO)' })
  @IsOptional()
  @IsString()
  publishAt?: string;

  @ApiPropertyOptional({ type: [BlockDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BlockDto)
  blocks?: BlockDto[];

  @ApiPropertyOptional({ type: SeoDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoDto)
  seo?: SeoDto;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: 'Kapak gorseli (Media id; bos string = kaldir)',
  })
  @IsOptional()
  @IsString()
  coverImageId?: string;
}

export class UpdateEntryDto extends PartialType(CreateEntryDto) {}

export class ListQueryDto {
  @ApiPropertyOptional({ enum: ENTRY_TYPES })
  @IsOptional()
  @IsIn(ENTRY_TYPES)
  type?: EntryType;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number;

  @ApiPropertyOptional({
    description: 'Sadece featured (Highlights) icerikler',
  })
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true' || value === '1')
  @IsBoolean()
  featured?: boolean;
}
