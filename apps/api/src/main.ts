import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter.js';
import { createGlobalValidationPipe } from './common/pipes/validation.pipe.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  // Express hardening: remove X-Powered-By header
  app.disable('x-powered-by');

  // Attach structured Pino logger
  const logger = app.get(Logger);
  app.useLogger(logger);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port', 3000);
  const trustProxyHops = configService.get<number>('trustProxyHops', 0);
  const allowedOrigins = configService.get<string[]>('cors.origins', []);

  // Configure Express trust proxy safely using integer hops (never boolean true)
  app.set('trust proxy', trustProxyHops);

  // Global API route prefix
  app.setGlobalPrefix('api');

  // CORS configuration: specific origins, trimmed, no wildcards
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (such as mobile apps or curl/Postman)
      if (!origin) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS origin '${origin}' is not permitted by policy`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
  });

  // Global validation and exception handling
  app.useGlobalPipes(createGlobalValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI documentation
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Project Management System API')
    .setDescription('Authoritative REST API specification for Web and Mobile clients')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  logger.log(`Server listening on port ${port} with trust proxy hops: ${trustProxyHops}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/api/docs`);
  logger.log(`Health endpoint available at http://localhost:${port}/api/health`);
}

bootstrap().catch((err) => {
  console.error('Fatal application bootstrap failure:', err);
  process.exit(1);
});
