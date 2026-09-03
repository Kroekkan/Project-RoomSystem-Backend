import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { PostCategory } from '@prisma/client';

export class CreatePublicPostDto {
  @IsEnum(PostCategory)
  "category": PostCategory;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  "title": string;

  @IsString()
  @IsNotEmpty()
  "message": string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  "location"?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }

    return Number(value);
  })
  @IsInt()
  "roomId"?: number;

  @IsOptional()
  @IsString()
  "startDate"?: string;

  @IsOptional()
  @IsString()
  "endDate"?: string;
}