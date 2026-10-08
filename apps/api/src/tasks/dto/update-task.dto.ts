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
import { TaskPriority, TaskStatus } from '../../generated/prisma/client.js';

export class UpdateTaskDto {
  @ApiPropertyOptional({ description: 'Task name', example: 'Updated task name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'name cannot be empty if provided' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(150, { message: 'name must not exceed 150 characters' })
  name?: string;

  @ApiPropertyOptional({ description: 'Task description', example: 'Updated description' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'priority must be LOW, MEDIUM, or HIGH' })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'status must be PENDING, IN_PROGRESS, or COMPLETED' })
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Due date in ISO format (YYYY-MM-DD)', example: '2026-11-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'dueDate must be a valid ISO8601 date string' })
  dueDate?: string;
}
