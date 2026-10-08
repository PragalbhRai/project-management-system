import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

export interface HealthResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  database: {
    status: 'up' | 'down';
    latencyMs?: number;
    error?: string;
  };
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResponse> {
    const startTime = Date.now();
    let dbStatus: 'up' | 'down' = 'down';
    let dbError: string | undefined;
    let latencyMs: number | undefined;

    try {
      // Required tagged $queryRaw`SELECT 1` for database connectivity check
      await this.prisma.$queryRaw`SELECT 1`;
      dbStatus = 'up';
      latencyMs = Date.now() - startTime;
    } catch (err) {
      dbStatus = 'down';
      dbError = err instanceof Error ? err.message : 'Database check failed';
      this.logger.error(`Database health check failed: ${dbError}`);
    }

    const response: HealthResponse = {
      status: dbStatus === 'up' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime() * 100) / 100,
      database: {
        status: dbStatus,
        ...(latencyMs !== undefined ? { latencyMs } : {}),
        ...(dbError ? { error: 'Database connection failed' } : {}),
      },
    };

    if (dbStatus === 'down') {
      throw new ServiceUnavailableException(response);
    }

    return response;
  }
}
