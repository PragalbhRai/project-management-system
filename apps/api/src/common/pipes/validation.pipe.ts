import { ValidationPipe as NestValidationPipe, BadRequestException } from '@nestjs/common';

export const createGlobalValidationPipe = () =>
  new NestValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: false,
    },
    stopAtFirstError: false,
    exceptionFactory: (errors) => {
      const messages = errors.flatMap((error) => {
        if (error.constraints) {
          return Object.values(error.constraints);
        }
        if (error.children && error.children.length > 0) {
          return error.children.flatMap((c) =>
            c.constraints ? Object.values(c.constraints) : ['Invalid nested field'],
          );
        }
        return ['Validation error'];
      });

      return new BadRequestException(messages);
    },
  });
