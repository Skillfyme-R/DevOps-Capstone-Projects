import { Request, Response, NextFunction, RequestHandler } from 'express';
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const id = (req.headers['x-request-id'] as string) ?? uuidv4();
    (req as any).requestId = id;
    res.setHeader('X-Request-Id', id);
    next();
  };
}
