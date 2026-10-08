import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { createGlobalValidationPipe } from '../src/common/pipes/validation.pipe.js';

describe('Projects, Tasks & Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let userAToken: string;
  let userAId: string;
  let userBToken: string;
  let userBId: string;

  let projectAId: string;
  let taskAId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(createGlobalValidationPipe());
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
    prisma = app.get(PrismaService);

    // Register User A
    const regARes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'User Alpha',
        email: `alpha_${Date.now()}@example.com`,
        password: 'Password123!Secure',
      })
      .expect(201);
    userAId = regARes.body.user.id;
    userAToken = regARes.body.accessToken;

    // Register User B
    const regBRes = await request(app.getHttpServer())
      .post('/api/auth/register')
      .send({
        fullName: 'User Beta',
        email: `beta_${Date.now()}@example.com`,
        password: 'Password123!Secure',
      })
      .expect(201);
    userBId = regBRes.body.user.id;
    userBToken = regBRes.body.accessToken;
  });

  afterAll(async () => {
    if (userAId) {
      await prisma.user.deleteMany({ where: { id: userAId } });
    }
    if (userBId) {
      await prisma.user.deleteMany({ where: { id: userBId } });
    }
    await app.close();
  });

  describe('Projects - Security & CRUD', () => {
    it('1. authenticated user can create project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Project Alpha Primary',
          description: 'A confidential project for User A',
          status: 'IN_PROGRESS',
          startDate: '2026-10-01',
          endDate: '2026-12-31',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Project Alpha Primary');
      expect(res.body.ownerId).toBe(userAId);
      expect(res.body.status).toBe('IN_PROGRESS');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.updatedAt).toBeDefined();

      projectAId = res.body.id;
    });

    it('rejects project creation if endDate is earlier than startDate', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Invalid Date Project',
          startDate: '2026-12-31',
          endDate: '2026-10-01',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.message).toContain('endDate');
    });

    it('2. authenticated user can list only their projects', async () => {
      // User A lists projects -> has 1 project
      const resA = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(resA.body)).toBe(true);
      expect(resA.body.length).toBe(1);
      expect(resA.body[0].id).toBe(projectAId);

      // User B lists projects -> has 0 projects
      const resB = await request(app.getHttpServer())
        .get('/api/projects')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(Array.isArray(resB.body)).toBe(true);
      expect(resB.body.length).toBe(0);
    });

    it('3. authenticated user can view and edit own project', async () => {
      // View
      const getRes = await request(app.getHttpServer())
        .get(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);
      expect(getRes.body.id).toBe(projectAId);

      // Edit
      const putRes = await request(app.getHttpServer())
        .put(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Project Alpha Primary - Renamed',
          status: 'COMPLETED',
        })
        .expect(200);

      expect(putRes.body.name).toBe('Project Alpha Primary - Renamed');
      expect(putRes.body.status).toBe('COMPLETED');
    });

    it('4. user B gets 404 when accessing/updating/deleting user A project', async () => {
      // User B GET user A project -> 404 (not 403)
      await request(app.getHttpServer())
        .get(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      // User B PUT user A project -> 404
      await request(app.getHttpServer())
        .put(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Hacked by User B' })
        .expect(404);

      // User B DELETE user A project -> 404
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      // User B listing tasks of user A project -> 404
      await request(app.getHttpServer())
        .get(`/api/projects/${projectAId}/tasks`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });
  });

  describe('Tasks - Security & CRUD', () => {
    it('5. authenticated user can create task in own project', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          projectId: projectAId,
          name: 'Task 1: Security Audit',
          description: 'Perform penetration test on endpoints',
          priority: 'HIGH',
          status: 'PENDING',
          dueDate: '2026-11-15',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.projectId).toBe(projectAId);
      expect(res.body.name).toBe('Task 1: Security Audit');
      expect(res.body.priority).toBe('HIGH');
      expect(res.body.status).toBe('PENDING');

      taskAId = res.body.id;
    });

    it('6. authenticated user can list own tasks', async () => {
      const resA = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(Array.isArray(resA.body)).toBe(true);
      expect(resA.body.length).toBe(1);
      expect(resA.body[0].id).toBe(taskAId);

      // Also verify via project detail tasks endpoint
      const projectTasksRes = await request(app.getHttpServer())
        .get(`/api/projects/${projectAId}/tasks`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(projectTasksRes.body.length).toBe(1);
      expect(projectTasksRes.body[0].id).toBe(taskAId);

      // User B lists tasks -> 0 tasks
      const resB = await request(app.getHttpServer())
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(resB.body.length).toBe(0);
    });

    it('7. authenticated user can update own task (including completion)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'COMPLETED',
          priority: 'LOW',
        })
        .expect(200);

      expect(res.body.status).toBe('COMPLETED');
      expect(res.body.priority).toBe('LOW');
    });

    it('8. user B gets 404 when accessing/updating/deleting user A task', async () => {
      // User B GET user A task -> 404
      await request(app.getHttpServer())
        .get(`/api/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);

      // User B PUT user A task -> 404
      await request(app.getHttpServer())
        .put(`/api/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({ name: 'Tampered Task' })
        .expect(404);

      // User B DELETE user A task -> 404
      await request(app.getHttpServer())
        .delete(`/api/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(404);
    });

    it('9. user B cannot create a task inside user A project (returns 404)', async () => {
      await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          projectId: projectAId,
          name: 'Unauthorized Task',
        })
        .expect(404);
    });
  });

  describe('Search & Filtering', () => {
    let secondProjectAId: string;
    let secondTaskAId: string;

    beforeAll(async () => {
      // Create second project for search/filter testing
      const projRes = await request(app.getHttpServer())
        .post('/api/projects')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          name: 'Backend Microservice Refactor',
          status: 'IN_PROGRESS',
        })
        .expect(201);
      secondProjectAId = projRes.body.id;

      // Create second task
      const taskRes = await request(app.getHttpServer())
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          projectId: secondProjectAId,
          name: 'Generate Swagger API Report',
          priority: 'HIGH',
          status: 'PENDING',
        })
        .expect(201);
      secondTaskAId = taskRes.body.id;
    });

    it('11. project search by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/projects?search=microservice')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(secondProjectAId);
    });

    it('12. project status filter and combination with search', async () => {
      // Filter by status IN_PROGRESS
      const resInProgress = await request(app.getHttpServer())
        .get('/api/projects?status=IN_PROGRESS')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resInProgress.body.length).toBe(1);
      expect(resInProgress.body[0].id).toBe(secondProjectAId);

      // Combination search + status
      const resCombo = await request(app.getHttpServer())
        .get('/api/projects?search=Refactor&status=IN_PROGRESS')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resCombo.body.length).toBe(1);
    });

    it('13. task search by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/tasks?search=swagger')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].id).toBe(secondTaskAId);
    });

    it('14. task status filter', async () => {
      const resPending = await request(app.getHttpServer())
        .get('/api/tasks?status=PENDING')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resPending.body.length).toBe(1);
      expect(resPending.body[0].id).toBe(secondTaskAId);

      const resCompleted = await request(app.getHttpServer())
        .get('/api/tasks?status=COMPLETED')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resCompleted.body.length).toBe(1);
      expect(resCompleted.body[0].id).toBe(taskAId);
    });

    it('15. task priority filter and combined search/status/priority query', async () => {
      const resHigh = await request(app.getHttpServer())
        .get('/api/tasks?priority=HIGH')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resHigh.body.length).toBe(1);
      expect(resHigh.body[0].id).toBe(secondTaskAId);

      // Combined search + status + priority
      const resCombo = await request(app.getHttpServer())
        .get('/api/tasks?search=report&status=PENDING&priority=HIGH')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resCombo.body.length).toBe(1);
      expect(resCombo.body[0].id).toBe(secondTaskAId);
    });
  });

  describe('Dashboard Metrics', () => {
    it('10. dashboard counts are strictly scoped to authenticated user', async () => {
      // User A has 2 projects (1 completed, 1 in progress) and 2 tasks (1 completed, 1 pending)
      const resA = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      expect(resA.body).toEqual({
        totalProjects: 2,
        totalTasks: 2,
        completedTasks: 1,
        pendingTasks: 1,
        projectsInProgress: 1,
      });

      // User B has 0 projects and 0 tasks
      const resB = await request(app.getHttpServer())
        .get('/api/dashboard')
        .set('Authorization', `Bearer ${userBToken}`)
        .expect(200);

      expect(resB.body).toEqual({
        totalProjects: 0,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0,
        projectsInProgress: 0,
      });
    });
  });

  describe('Cleanup & Cascading Deletion', () => {
    it('authenticated user can delete own project, which cascades to tasks', async () => {
      // Delete Project A
      await request(app.getHttpServer())
        .delete(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(200);

      // Project is gone
      await request(app.getHttpServer())
        .get(`/api/projects/${projectAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);

      // Task that belonged to Project A is cascaded and gone
      await request(app.getHttpServer())
        .get(`/api/tasks/${taskAId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .expect(404);
    });
  });
});
