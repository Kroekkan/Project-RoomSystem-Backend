import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    "email": string;

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    "password": string;

    @IsOptional()
    @IsEnum(Role)
    "role"?: Role;

}