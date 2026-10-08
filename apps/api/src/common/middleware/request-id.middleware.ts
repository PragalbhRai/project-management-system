import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.header('x-request-id');
    const requestId = incomingId && uuidValidate(incomingId) ? incomingId : uuidv4();

    req.id = requestId;
    res.setHeader('X-Request-ID', requestId);

    next();
  }
}
