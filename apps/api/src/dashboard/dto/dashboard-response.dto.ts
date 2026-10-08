import { ApiProperty } from '@nestjs/swagger';

export class DashboardResponseDto {
  @ApiProperty({ description: 'Total number of projects owned by user', example: 5 })
  totalProjects!: number;

  @ApiProperty({ description: 'Total number of tasks across owned projects', example: 12 })
  totalTasks!: number;

  @ApiProperty({ description: 'Total number of completed tasks', example: 7 })
  completedTasks!: number;

  @ApiProperty({ description: 'Total number of pending tasks', example: 4 })
  pendingTasks!: number;

  @ApiProperty({ description: 'Total number of projects currently in progress', example: 2 })
  projectsInProgress!: number;
}
