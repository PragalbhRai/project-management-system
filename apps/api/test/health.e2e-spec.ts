import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { createGlobalValidationPipe } from '../src/common/pipes/validation.pipe.js';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('GET /api/health returns HTTP 200 with meaningful database connectivity information', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(response.body).toBeDefined();
    expect(response.body.status).toBe('ok');
    expect(response.body.timestamp).toBeDefined();
    expect(typeof response.body.uptime).toBe('number');
    expect(response.body.database).toBeDefined();
    expect(response.body.database.status).toBe('up');
    expect(typeof response.body.database.latencyMs).toBe('number');

    // Verify X-Request-ID propagation
    expect(response.headers['x-request-id']).toBeDefined();
  });
});
