import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
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
  @IsString()
  "imageUrl"?: string;
  
  @IsOptional()
  "startDate"?: string;

  @IsOptional()
  "endDate"?: string;

}