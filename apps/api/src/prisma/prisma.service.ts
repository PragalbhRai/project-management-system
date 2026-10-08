import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, type PrismaClient as PrismaClientType } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';

const BasePrismaClient = PrismaClient as unknown as new (
  ...args: any[]
) => PrismaClientType;

@Injectable()
export class PrismaService extends BasePrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const databaseUrl = configService.get<string>('DATABASE_URL') || process.env.DATABASE_URL || '';
    const adapter = new PrismaPg({ connectionString: databaseUrl });
    super({ adapter });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.$connect();
      this.logger.log('Successfully connected to PostgreSQL database via Prisma 7 driver adapter');
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database during Prisma initialization', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Disconnected Prisma client');
  }
}
