import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { IsString, IsNotEmpty, IsEmail, IsEnum, IsOptional } from "class-validator";

export class SignUpDto {
    @ApiProperty({
      description: 'User name',
      example: 'john_doe',
    })
    @IsString()
    @IsNotEmpty()
    name: string;
  
    @ApiProperty({
      description: 'User password',
      example: 'password123',
    })
    @IsEmail()
    @IsNotEmpty()
    email: string;
    
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string;
  
    @ApiProperty({ enum: Role })
    @IsEnum(Role)
    @IsOptional()
    role?: Role;
}
