import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskQueryDto } from './dto/task-query.dto.js';
import type { Task } from '../generated/prisma/client.js';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTaskDto): Promise<Task> {
    // Check that target project exists and is owned by authenticated user
    const project = await this.prisma.project.findFirst({
      where: {
        id: dto.projectId,
        ownerId: userId,
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID '${dto.projectId}' not found`);
    }

    const dueDate = dto.dueDate ? new Date(dto.dueDate) : undefined;

    return this.prisma.task.create({
      data: {
        projectId: dto.projectId,
        name: dto.name,
        description: dto.description,
        priority: dto.priority,
        status: dto.status,
        dueDate,
      },
    });
  }

  async findAll(userId: string, query?: TaskQueryDto): Promise<Task[]> {
    const where: any = {
      project: {
        ownerId: userId, // Enforce project ownership on all task queries
      },
    };

    if (query?.projectId) {
      where.projectId = query.projectId;
    }

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.priority) {
      where.priority = query.priority;
    }

    if (query?.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    return this.prisma.task.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Task> {
    const task = await this.prisma.task.findFirst({
      where: {
        id,
        project: {
          ownerId: userId, // Must belong to a project owned by user
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    return task;
  }

  async update(userId: string, id: string, dto: UpdateTaskDto): Promise<Task> {
    // Verify ownership first -> 404 if not owned
    await this.findOne(userId, id);

    const dueDate = dto.dueDate !== undefined
      ? (dto.dueDate ? new Date(dto.dueDate) : null)
      : undefined;

    return this.prisma.task.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.priority !== undefined && { priority: dto.priority }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dueDate !== undefined && { dueDate }),
      },
    });
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    // Verify ownership first -> 404 if not owned
    await this.findOne(userId, id);

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }
}
