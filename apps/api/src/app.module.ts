import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import configuration from './config/configuration.js';
import { validateEnvironment } from './config/env.validation.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { ThrottlerModule } from '@nestjs/throttler';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { TasksModule } from './tasks/tasks.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get<string>('nodeEnv') === 'production';
        return {
          pinoHttp: {
            level: isProduction ? 'info' : 'debug',
            transport: !isProduction
              ? {
                  target: 'pino-pretty',
                  options: {
                    colorize: true,
                    singleLine: true,
                    translateTime: 'yyyy-mm-dd HH:MM:ss.l',
                    ignore: 'pid,hostname',
                  },
                }
              : undefined,
            // Redact sensitive fields across all logs
            redact: {
              paths: [
                'req.headers.authorization',
                'req.headers.Authorization',
                'req.headers.cookie',
                'req.headers.Cookie',
                'req.headers["x-access-token"]',
                '*.password',
                '*.Password',
                '*.passwordHash',
                '*.password_hash',
                '*.token',
                '*.refreshToken',
                '*.refresh_token',
                '*.jwtSecret',
                '*.JWT_SECRET',
                '*.databaseUrl',
                '*.DATABASE_URL',
              ],
              censor: '[REDACTED]',
            },
            // Custom request serializer: never dumps full request bodies into logs
            serializers: {
              req: (req: any) => ({
                id: req.id,
                method: req.method,
                url: req.url,
                query: req.query,
                headers: {
                  host: req.headers?.host,
                  'user-agent': req.headers?.['user-agent'],
                  'x-request-id': req.headers?.['x-request-id'],
                },
              }),
            },
            customProps: (req: any) => ({
              requestId: req.id,
            }),
          },
        };
      },
    }),
    PrismaModule,
    HealthModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('auth.throttleTtl', 60000),
          limit: configService.get<number>('auth.throttleLimit', 10),
        },
      ],
    }),
    UsersModule,
    AuthModule,
    ProjectsModule,
    TasksModule,
    DashboardModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
