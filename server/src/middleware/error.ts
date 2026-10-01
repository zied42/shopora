import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { OrderScanError, StockError } from '../store/types';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.body);
    if (!r.success) {
      res.status(400).json({ success: false, error: r.error.issues[0]?.message ?? 'Invalid request body' });
      return;
    }
    req.body = r.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const r = schema.safeParse(req.query);
    if (!r.success) {
      res.status(400).json({ success: false, error: 'Invalid query parameters' });
      return;
    }
    req.query = r.data as Request['query'];
    next();
  };
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'Route not found' });
}

export function errorHandler(err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof StockError) {
    res.status(400).json({ success: false, error: err.message });
    return;
  }
  if (err instanceof OrderScanError) {
    const status = err.code === 'not_found' ? 404 : err.code === 'conflict' ? 409 : 400;
    res.status(status).json({ success: false, error: err.message });
    return;
  }
  console.error('[error]', err);
  res.status(err.status ?? 500).json({ success: false, error: err.message ?? 'Internal server error' });
}