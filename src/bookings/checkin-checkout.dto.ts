import { IsDateString, IsOptional } from 'class-validator';

export class CheckInDto {
  @IsOptional()
  @IsDateString()
  time?: string;
}
 
export class CheckOutDto {
  @IsOptional()
  @IsDateString()
  time?: string;
}
 