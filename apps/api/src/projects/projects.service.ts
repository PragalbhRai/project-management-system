import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectQueryDto } from './dto/project-query.dto.js';
import type { Project, Task } from '../generated/prisma/client.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query?: ProjectQueryDto): Promise<Project[]> {
    const where: any = {
      ownerId: userId,
    };

    if (query?.status) {
      where.status = query.status;
    }

    if (query?.search && query.search.trim().length > 0) {
      where.name = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    return this.prisma.project.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string): Promise<Project> {
    const project = await this.prisma.project.findFirst({
      where: {
        id,
        ownerId: userId, // Enforce ownership; other user's project returns 404
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID '${id}' not found`);
    }

    return project;
  }

  async create(userId: string, dto: CreateProjectDto): Promise<Project> {
    const startDate = dto.startDate ? new Date(dto.startDate) : undefined;
    const endDate = dto.endDate ? new Date(dto.endDate) : undefined;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    return this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        status: dto.status,
        startDate,
        endDate,
        ownerId: userId,
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateProjectDto): Promise<Project> {
    // Check ownership first
    const existing = await this.findOne(userId, id);

    const startDate = dto.startDate !== undefined
      ? (dto.startDate ? new Date(dto.startDate) : null)
      : existing.startDate;

    const endDate = dto.endDate !== undefined
      ? (dto.endDate ? new Date(dto.endDate) : null)
      : existing.endDate;

    if (startDate && endDate && endDate < startDate) {
      throw new BadRequestException('endDate must be greater than or equal to startDate');
    }

    return this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.startDate !== undefined && { startDate }),
        ...(dto.endDate !== undefined && { endDate }),
      },
    });
  }

  async remove(userId: string, id: string): Promise<{ message: string }> {
    // Check ownership first
    await this.findOne(userId, id);

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async findProjectTasks(userId: string, projectId: string): Promise<Task[]> {
    // Verify project exists and belongs to authenticated user
    await this.findOne(userId, projectId);

    return this.prisma.task.findMany({
      where: {
        projectId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
