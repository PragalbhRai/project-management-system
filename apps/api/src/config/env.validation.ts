import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsString()
  @IsNotEmpty({ message: 'DATABASE_URL is required' })
  DATABASE_URL!: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET must be at least 32 characters long' })
  JWT_SECRET!: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '1d';

  @IsString()
  @IsNotEmpty({ message: 'CORS_ORIGIN is required' })
  CORS_ORIGIN!: string;

  @IsInt()
  @Min(0, { message: 'TRUST_PROXY_HOPS must be an integer >= 0' })
  TRUST_PROXY_HOPS: number = 0;

  @IsInt()
  @IsOptional()
  AUTH_RATE_LIMIT: number = 10;

  @IsInt()
  @IsOptional()
  AUTH_RATE_LIMIT_TTL: number = 60000;

  @IsNumber()
  @Min(1)
  PORT: number = 3000;

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;
}

export function validateEnvironment(config: Record<string, unknown>): EnvironmentVariables {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const formattedErrors = errors
      .map((err) => {
        const constraints = Object.values(err.constraints || {}).join(', ');
        return ` - [${err.property}]: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `\n=======================================================\n` +
      `ENVIRONMENT CONFIGURATION VALIDATION FAILED:\n` +
      `${formattedErrors}\n` +
      `=======================================================\n`,
    );
  }

  return validatedConfig;
}
