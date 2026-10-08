import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interface.js';
import { ProjectsService } from './projects.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { ProjectQueryDto } from './dto/project-query.dto.js';
import type { Project, Task } from '../generated/prisma/client.js';

@ApiTags('Projects')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @ApiOperation({ summary: 'List all projects belonging to the authenticated user' })
  @ApiResponse({ status: 200, description: 'List of owned projects' })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ProjectQueryDto,
  ): Promise<Project[]> {
    return this.projectsService.findAll(user.id, query);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new project for the authenticated user' })
  @ApiResponse({ status: 201, description: 'Project successfully created' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid dates' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateProjectDto,
  ): Promise<Project> {
    return this.projectsService.create(user.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a project by ID (must be owned by user)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project details' })
  @ApiResponse({ status: 404, description: 'Project not found or not owned by user' })
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Project> {
    return this.projectsService.findOne(user.id, id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an existing project owned by user' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project updated successfully' })
  @ApiResponse({ status: 400, description: 'Validation failed or invalid dates' })
  @ApiResponse({ status: 404, description: 'Project not found or not owned by user' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<Project> {
    return this.projectsService.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a project owned by user' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'Project deleted successfully' })
  @ApiResponse({ status: 404, description: 'Project not found or not owned by user' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<{ message: string }> {
    return this.projectsService.remove(user.id, id);
  }

  @Get(':id/tasks')
  @ApiOperation({ summary: 'List all tasks for a project owned by user' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiResponse({ status: 200, description: 'List of tasks in project' })
  @ApiResponse({ status: 404, description: 'Project not found or not owned by user' })
  async findTasks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<Task[]> {
    return this.projectsService.findProjectTasks(user.id, id);
  }
}
