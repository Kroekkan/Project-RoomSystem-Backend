import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, MinLength } from "class-validator";
import { Role } from "@prisma/client";

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    "name": string;

    @IsEmail()
    @IsNotEmpty()
    "email": string;

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    "password": string;

    @IsString()
    @IsNotEmpty()
    "branch": string;

    @IsOptional()
    @IsEnum(Role)
    "role"?: Role;

}