import { IsString } from "class-validator"
import { IsEmail } from "class-validator"
import { IsNotEmpty } from "class-validator"
import { ApiProperty } from "@nestjs/swagger"

export class SignInDto {
    @ApiProperty()
    @IsEmail()
    @IsNotEmpty()
    email: string

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    password: string
}