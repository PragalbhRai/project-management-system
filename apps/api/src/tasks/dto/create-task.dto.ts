import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { TaskPriority, TaskStatus } from '../../generated/prisma/client.js';

export class CreateTaskDto {
  @ApiProperty({ description: 'Parent Project UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID('4', { message: 'projectId must be a valid UUID' })
  @IsNotEmpty({ message: 'projectId is required' })
  projectId!: string;

  @ApiProperty({ description: 'Task name', example: 'Implement auth guard' })
  @IsString()
  @IsNotEmpty({ message: 'name is required' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(150, { message: 'name must not exceed 150 characters' })
  name!: string;

  @ApiPropertyOptional({ description: 'Task description', example: 'Extract JWT and verify claims' })
  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @MaxLength(2000, { message: 'description must not exceed 2000 characters' })
  description?: string;

  @ApiPropertyOptional({
    description: 'Task priority',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsOptional()
  @IsEnum(TaskPriority, { message: 'priority must be LOW, MEDIUM, or HIGH' })
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task status',
    enum: TaskStatus,
    default: TaskStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TaskStatus, { message: 'status must be PENDING, IN_PROGRESS, or COMPLETED' })
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Due date in ISO format (YYYY-MM-DD)', example: '2026-11-01' })
  @IsOptional()
  @IsISO8601({}, { message: 'dueDate must be a valid ISO8601 date string' })
  dueDate?: string;
}
