import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ProjectStatus } from '../../generated/prisma/client.js';

export class UpdateProjectDto {
  @ApiPropertyOptional({ description: 'Project name', example: 'Mobile App Redesign Updated' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name cannot be empty if provided' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(150, { message: 'name must not exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({ description: 'Project description', example: 'Updated description' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Project status',
    enum: ProjectStatus,
  })
  @IsOptional()
  @IsEnum(ProjectStatus, { message: 'status must be a valid ProjectStatus (NOT_STARTED, IN_PROGRESS, COMPLETED)' })
  status?: ProjectStatus;

  @ApiPropertyOptional({ description: 'Start date in ISO format (YYYY-MM-DD)', example: '2026-10-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'startDate must be a valid ISO8601 date string' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in ISO format (YYYY-MM-DD)', example: '2026-12-31' })
  @IsOptional()
  @IsISO8601({}, { message: 'endDate must be a valid ISO8601 date string' })
  endDate?: string;
}
