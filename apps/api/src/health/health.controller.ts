import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService, HealthResponse } from './health.service.js';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Health check endpoint',
    description: 'Verifies application runtime and active PostgreSQL database connectivity via Prisma 7.',
  })
  @ApiResponse({
    status: 200,
    description: 'Application and database are healthy',
  })
  @ApiResponse({
    status: 503,
    description: 'Database connectivity failure',
  })
  async getHealth(): Promise<HealthResponse> {
    return this.healthService.check();
  }
}
