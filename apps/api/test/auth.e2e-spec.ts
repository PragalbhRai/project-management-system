import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter.js';
import { createGlobalValidationPipe } from '../src/common/pipes/validation.pipe.js';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwtService: JwtService;

  const testUserEmail = `authtest_${Date.now()}@example.com`;
  const testPassword = 'Password123!Secure';
  let accessToken: string;
  let userId: string;

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
    jwtService = app.get(JwtService);
  });

  afterAll(async () => {
    // Clean up test user and revoked tokens
    if (userId) {
      await prisma.user.deleteMany({
        where: { id: userId },
      });
    }
    await app.close();
  });

  describe('POST /api/auth/register', () => {
    it('successfully registers a user with HTTP 201, safe user shape, and access token', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: '  Test Runner  ',
          email: testUserEmail.toUpperCase(), // Test case normalization
          password: testPassword,
        })
        .expect(201);

      expect(res.body.user).toBeDefined();
      expect(res.body.user.fullName).toBe('Test Runner'); // Trimmed
      expect(res.body.user.email).toBe(testUserEmail.toLowerCase()); // Lowercased
      expect(res.body.user.id).toBeDefined();
      expect(res.body.accessToken).toBeDefined();

      // Ensure password or passwordHash are NEVER returned
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();

      userId = res.body.user.id;
      accessToken = res.body.accessToken;
    });

    it('rejects duplicate email with safe HTTP 409 Conflict', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Another Name',
          email: testUserEmail,
          password: testPassword,
        })
        .expect(409);

      expect(res.body.statusCode).toBe(409);
      expect(res.body.message).toContain('already exists');
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects invalid email with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Invalid User',
          email: 'not-an-email',
          password: testPassword,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects empty or whitespace-only fullName with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: '   ',
          email: `valid_${Date.now()}@example.com`,
          password: testPassword,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects short passwords (< 8 chars) with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Short Pwd User',
          email: `shortpwd_${Date.now()}@example.com`,
          password: 'short',
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects unknown request properties with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Valid User',
          email: `unknownfield_${Date.now()}@example.com`,
          password: testPassword,
          isAdmin: true, // Unknown property
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects registration request missing fullName with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `missing_name_${Date.now()}@example.com`,
          password: testPassword,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects registration request missing email with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Missing Email User',
          password: testPassword,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.requestId).toBeDefined();
    });

    it('rejects registration request missing password with HTTP 400', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Missing Password User',
          email: `missing_pwd_${Date.now()}@example.com`,
        })
        .expect(400);

      expect(res.body.statusCode).toBe(400);
      expect(res.body.error).toBe('Bad Request');
      expect(res.body.requestId).toBeDefined();
    });

    it('verifies password is stored securely hashed in the database and never leaked in responses', async () => {
      const specificEmail = `hashverify_${Date.now()}@example.com`;
      const specificPassword = 'PlaintextPasswordToVerify123!';

      const regRes = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          fullName: 'Hash Verification User',
          email: specificEmail,
          password: specificPassword,
        })
        .expect(201);

      // Verify no response field contains passwordHash or password
      expect(regRes.body.password).toBeUndefined();
      expect(regRes.body.passwordHash).toBeUndefined();
      expect(regRes.body.user.password).toBeUndefined();
      expect(regRes.body.user.passwordHash).toBeUndefined();

      const createdUserId = regRes.body.user.id;

      // Query database directly through Prisma in test
      const userInDb = await prisma.user.findUnique({
        where: { id: createdUserId },
      });

      expect(userInDb).toBeDefined();
      expect(userInDb?.passwordHash).toBeDefined();
      expect(typeof userInDb?.passwordHash).toBe('string');

      // passwordHash must NOT equal plaintext password
      expect(userInDb?.passwordHash).not.toBe(specificPassword);

      // Must match bcrypt format ($2a$ or $2b$)
      expect(userInDb?.passwordHash.startsWith('$2')).toBe(true);

      // Successfully verifies with bcrypt.compare
      const isMatch = await bcrypt.compare(specificPassword, userInDb!.passwordHash);
      expect(isMatch).toBe(true);

      // Non-matching password fails verification
      const isBadMatch = await bcrypt.compare('WrongPlaintext123!', userInDb!.passwordHash);
      expect(isBadMatch).toBe(false);

      // Clean up test user
      await prisma.user.delete({ where: { id: createdUserId } });
    });
  });

  describe('POST /api/auth/login', () => {
    it('authenticates valid credentials and returns 200 with JWT', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: testPassword,
        })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.user.id).toBe(userId);
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    });

    it('returns generic 401 Unauthorized for wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword!',
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
      expect(res.body.requestId).toBeDefined();
    });

    it('returns generic 401 Unauthorized for non-existent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent_account_12345@example.com',
          password: testPassword,
        })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.message).toBe('Invalid email or password');
      expect(res.body.requestId).toBeDefined();
    });
  });

  describe('JWT Claims Verification', () => {
    it('issued JWT contains valid sub, jti, exp > iat and no sensitive data', async () => {
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: testPassword,
        })
        .expect(200);

      const token = loginRes.body.accessToken;
      expect(typeof token).toBe('string');

      // Decode token without weakening application verification
      const decoded = jwtService.decode(token) as Record<string, unknown>;
      expect(decoded).toBeDefined();

      // sub equals the registered user ID
      expect(decoded.sub).toBe(userId);

      // jti is a non-empty unique identifier
      expect(typeof decoded.jti).toBe('string');
      expect((decoded.jti as string).length).toBeGreaterThan(0);

      // iat and exp are valid numbers and exp > iat
      expect(typeof decoded.iat).toBe('number');
      expect(typeof decoded.exp).toBe('number');
      expect((decoded.exp as number)).toBeGreaterThan((decoded.iat as number));

      // Token does NOT contain password, passwordHash, or unnecessary sensitive data
      expect(decoded.password).toBeUndefined();
      expect(decoded.passwordHash).toBeUndefined();
      expect(decoded.password_hash).toBeUndefined();
      expect(decoded.secret).toBeUndefined();
      expect(decoded.JWT_SECRET).toBeUndefined();
    });
  });

  describe('Protected endpoints: GET /api/auth/me', () => {
    it('returns 401 Unauthorized when authorization header is missing', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.requestId).toBeDefined();
    });

    it('returns 401 Unauthorized when token is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', 'Bearer not-a-valid-jwt-token')
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.requestId).toBeDefined();
    });

    it('returns 401 Unauthorized when token is expired', async () => {
      // Create deliberately expired token
      const expiredToken = await jwtService.signAsync(
        { sub: userId, jti: 'expired-test-jti' },
        { expiresIn: -10 },
      );

      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.statusCode).toBe(401);
      expect(res.body.requestId).toBeDefined();
    });

    it('returns 200 with safe user profile when valid bearer token is provided', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.id).toBe(userId);
      expect(res.body.email).toBe(testUserEmail.toLowerCase());
      expect(res.body.fullName).toBe('Test Runner');
      expect(res.body.createdAt).toBeDefined();
      expect(res.body.password).toBeUndefined();
      expect(res.body.passwordHash).toBeUndefined();
    });
  });

  describe('Token Revocation and Session Isolation', () => {
    it('revoked token cannot access /me after logout', async () => {
      // 1. Login to obtain token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword })
        .expect(200);

      const activeToken = loginRes.body.accessToken;

      // 2. Call /me successfully
      const meBeforeLogout = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(200);

      expect(meBeforeLogout.body.id).toBe(userId);

      // 3. Logout using that token
      const logoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(200);

      expect(logoutRes.body.message).toContain('Logged out successfully');

      // 4. Call /me using the SAME token immediately fails with 401
      const meAfterLogout = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${activeToken}`)
        .expect(401);

      expect(meAfterLogout.body.statusCode).toBe(401);
      expect(meAfterLogout.body.message).toBe('Authentication credentials missing or invalid');
    });

    it('new token remains valid after another token for the same user is revoked', async () => {
      // 1. Login and obtain token A
      const loginResA = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword })
        .expect(200);
      const tokenA = loginResA.body.accessToken;

      // 2. Login again and obtain token B
      const loginResB = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword })
        .expect(200);
      const tokenB = loginResB.body.accessToken;

      // Both tokens must be distinct
      expect(tokenA).not.toBe(tokenB);

      // 3. Logout using token A
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // 4. /me using token A -> 401 Unauthorized
      const meResA = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(401);
      expect(meResA.body.statusCode).toBe(401);

      // 5. /me using token B -> 200 OK
      const meResB = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);
      expect(meResB.body.id).toBe(userId);
    });

    it('logout idempotency: repeated logout using the same token is rejected with 401 because token is already revoked', async () => {
      // 1. Issue fresh token
      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: testUserEmail, password: testPassword })
        .expect(200);
      const token = loginRes.body.accessToken;

      // 2. First logout succeeds
      await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // 3. Repeated logout using the same token is rejected by the auth guard because token is now revoked
      const repeatLogoutRes = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(repeatLogoutRes.body.statusCode).toBe(401);
      expect(repeatLogoutRes.body.message).toBe('Authentication credentials missing or invalid');
    });
  });

  describe('Rate Limiting', () => {
    it('repeated login attempts eventually trigger HTTP 429 Too Many Requests', async () => {
      const throttledEmail = `ratelimit_${Date.now()}@example.com`;

      // Trigger repeated requests exceeding the limit (30 per 60s)
      const results: number[] = [];
      for (let i = 0; i < 35; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: throttledEmail, password: 'wrong' });
        results.push(res.status);
      }

      // At least one subsequent request should receive 429
      expect(results).toContain(429);
    });
  });
});
