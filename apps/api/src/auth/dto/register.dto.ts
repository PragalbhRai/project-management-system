import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Full name of the user',
    example: 'Demo User',
    maxLength: 100,
  })
  @IsString({ message: 'fullName must be a string' })
  @IsNotEmpty({ message: 'fullName is required and cannot be empty' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(100, { message: 'fullName must not exceed 100 characters' })
  fullName!: string;

  @ApiProperty({
    description: 'Email address of the user',
    example: 'demo@example.com',
  })
  @IsString({ message: 'email must be a string' })
  @IsNotEmpty({ message: 'email is required' })
  @IsEmail({}, { message: 'email must be a valid email address' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email!: string;

  @ApiProperty({
    description: 'User password (minimum 8 characters)',
    example: 'SecurePassword123!',
    minLength: 8,
    maxLength: 128,
  })
  @IsString({ message: 'password must be a string' })
  @IsNotEmpty({ message: 'password is required' })
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @MaxLength(128, { message: 'password must not exceed 128 characters' })
  password!: string;
}
