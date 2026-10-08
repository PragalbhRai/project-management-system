import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardResponseDto } from './dto/dashboard-response.dto.js';
import { ProjectStatus, TaskStatus } from '../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMetrics(userId: string): Promise<DashboardResponseDto> {
    const [
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      projectsInProgress,
    ] = await Promise.all([
      // Total projects owned by user
      this.prisma.project.count({
        where: { ownerId: userId },
      }),
      // Total tasks in projects owned by user
      this.prisma.task.count({
        where: { project: { ownerId: userId } },
      }),
      // Completed tasks in projects owned by user
      this.prisma.task.count({
        where: {
          project: { ownerId: userId },
          status: TaskStatus.COMPLETED,
        },
      }),
      // Pending tasks in projects owned by user
      this.prisma.task.count({
        where: {
          project: { ownerId: userId },
          status: TaskStatus.PENDING,
        },
      }),
      // Projects in progress owned by user
      this.prisma.project.count({
        where: {
          ownerId: userId,
          status: ProjectStatus.IN_PROGRESS,
        },
      }),
    ]);

    return {
      totalProjects,
      totalTasks,
      completedTasks,
      pendingTasks,
      projectsInProgress,
    };
  }
}
