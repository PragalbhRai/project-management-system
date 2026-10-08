import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UsersService } from '../../users/users.service.js';
import type { JwtPayload, AuthenticatedUser } from '../interfaces/auth.interface.js';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication credentials missing or invalid');
    }

    let payload: JwtPayload;
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret,
      });
    } catch (err) {
      this.logger.debug(`JWT verification failed: ${err instanceof Error ? err.message : err}`);
      throw new UnauthorizedException('Authentication credentials missing or invalid');
    }

    if (!payload.sub || !payload.jti) {
      throw new UnauthorizedException('Authentication credentials missing or invalid');
    }

    // Check if token has been revoked
    const revoked = await this.prisma.revokedToken.findUnique({
      where: { jti: payload.jti },
    });

    if (revoked) {
      this.logger.debug(`Presented token ${payload.jti} is revoked`);
      throw new UnauthorizedException('Authentication credentials missing or invalid');
    }

    // Confirm the user still exists in the database
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      this.logger.debug(`User with id ${payload.sub} no longer exists`);
      throw new UnauthorizedException('Authentication credentials missing or invalid');
    }

    // Attach safe authenticated user context to request
    request.user = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      jti: payload.jti,
      exp: payload.exp || Math.floor(Date.now() / 1000) + 86400,
    };

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
