import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { AuthService } from './auth.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type {
  AuthResponse,
  AuthenticatedUser,
  UserResponse,
} from './interfaces/auth.interface.js';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully with access token',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed or missing fields',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already registered',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded',
  })
  async register(@Body() dto: RegisterDto): Promise<AuthResponse> {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @ApiOperation({ summary: 'Authenticate user with email and password' })
  @ApiResponse({
    status: 200,
    description: 'Successfully authenticated, returns access token',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid email or password',
  })
  @ApiResponse({
    status: 429,
    description: 'Rate limit exceeded (5 requests per minute)',
  })
  async login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.authService.login(dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Log out user by revoking current JWT token' })
  @ApiResponse({
    status: 200,
    description: 'Token successfully revoked and invalidated',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or already revoked access token',
  })
  async logout(@CurrentUser() user: AuthenticatedUser): Promise<{ message: string }> {
    return this.authService.logout(user);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Retrieve currently authenticated user profile' })
  @ApiResponse({
    status: 200,
    description: 'Authenticated user profile returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized (token missing, invalid, or revoked)',
  })
  async getMe(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.authService.getMe(user.id);
  }
}
