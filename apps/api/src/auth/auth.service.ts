import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { UsersService } from '../users/users.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import type {
  AuthResponse,
  AuthenticatedUser,
  UserResponse,
} from './interfaces/auth.interface.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly saltRounds = 10;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();

    // Check if email already registered
    const existing = await this.usersService.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictException('A user with this email address already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    let user;
    try {
      user = await this.usersService.create({
        fullName: dto.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
      });
    } catch (err: unknown) {
      // Catch duplicate key error if concurrent insert happened
      const code = (err as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('A user with this email address already exists');
      }
      this.logger.error('Unexpected error while creating user', err);
      throw err;
    }

    const jti = uuidv4();
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      jti,
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        createdAt: user.createdAt.toISOString(),
      },
      accessToken,
    };
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const normalizedEmail = dto.email.trim().toLowerCase();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      // Generic error response to prevent user enumeration
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const jti = uuidv4();
    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      jti,
    });

    return {
      user: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
      },
      accessToken,
    };
  }

  async logout(user: AuthenticatedUser): Promise<{ message: string }> {
    try {
      await this.prisma.revokedToken.upsert({
        where: { jti: user.jti },
        create: {
          jti: user.jti,
          userId: user.id,
          expiresAt: new Date(user.exp * 1000),
          revokedAt: new Date(),
        },
        update: {},
      });
    } catch (err) {
      this.logger.error(`Error revoking token ${user.jti}`, err);
      throw err;
    }

    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string): Promise<UserResponse> {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException('User account no longer exists');
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      createdAt: user.createdAt.toISOString(),
    };
  }
}
