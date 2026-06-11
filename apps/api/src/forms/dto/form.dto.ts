import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class SubmitFormDto {
  @ApiProperty({ description: 'Form alan degerleri (name -> value)' })
  @IsObject()
  data!: Record<string, unknown>;

  @ApiProperty({ description: 'KVKK acik riza onayi' })
  @IsBoolean()
  consent!: boolean;

  @ApiPropertyOptional({
    description: 'Honeypot (gizli alan; bot doldurursa spam)',
  })
  @IsOptional()
  @IsString()
  hp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localeCode?: string;
}

export class UpdateSubmissionDto {
  @ApiProperty({ enum: ['NEW', 'READ', 'SPAM', 'ARCHIVED'] })
  @IsIn(['NEW', 'READ', 'SPAM', 'ARCHIVED'])
  status!: string;
}

// ----------------------- Form tanimlama (admin) -----------------------

export class FormFieldDto {
  @ApiProperty({ example: 'email', description: 'Alan adi (data anahtari)' })
  @IsString()
  @Matches(/^[a-zA-Z][a-zA-Z0-9_-]*$/, {
    message: 'name harf ile baslamali, alfasayisal olmali',
  })
  name!: string;

  @ApiPropertyOptional({ example: 'E-posta' })
  @IsOptional()
  @IsString()
  label?: string;

  @ApiPropertyOptional({
    enum: ['text', 'email', 'tel', 'textarea', 'select'],
    default: 'text',
  })
  @IsOptional()
  @IsIn(['text', 'email', 'tel', 'textarea', 'select'])
  type?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({
    type: [String],
    description: 'select tipi icin secenekler',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}

export class CreateFormDefinitionDto {
  @ApiProperty({ example: 'newsletter' })
  @IsString()
  @Matches(/^[a-z][a-z0-9-]*$/, { message: 'key kucuk-harf/kebab-case olmali' })
  key!: string;

  @ApiProperty({ example: 'Bulten Kaydi' })
  @IsString()
  name!: string;

  @ApiProperty({ type: [FormFieldDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FormFieldDto)
  fields!: FormFieldDto[];

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateFormDefinitionDto extends PartialType(
  CreateFormDefinitionDto,
) {}
