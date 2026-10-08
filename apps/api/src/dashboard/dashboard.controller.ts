import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/auth.interface.js';
import { DashboardService } from './dashboard.service.js';
import { DashboardResponseDto } from './dto/dashboard-response.dto.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @ApiOperation({ summary: 'Get summary metrics for authenticated user' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard metrics calculated successfully',
    type: DashboardResponseDto,
  })
  async getDashboard(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardResponseDto> {
    return this.dashboardService.getMetrics(user.id);
  }
}
