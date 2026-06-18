import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction, RequestHandler } from 'express';

export function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const id = (req.headers['x-request-id'] as string) || uuidv4();
    (req as any).requestId = id;
    res.setHeader('x-request-id', id);
    next();
  };
}
