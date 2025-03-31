import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsString, IsOptional, IsEnum } from "class-validator";

export class UpdateUserDto {
    @ApiProperty()
    @IsString()
    @IsOptional()
    name?: string;
    
    @ApiProperty()
    @IsString()
    password?: string;

    @ApiProperty()
    @IsOptional()
    @IsEnum(Role)
    role?: Role;
}