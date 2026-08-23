import { PartialType } from '@nestjs/mapped-types';
import { CreatePublicPostDto } from './create-public-post.dto';
import { IsBoolean, IsOptional } from 'class-validator';

export class UpdatePublicPostDto extends PartialType(CreatePublicPostDto) {
  @IsOptional()
  @IsBoolean()
  resolved?: boolean;
}