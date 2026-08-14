import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
  public statusCode: number;
  public details?: unknown;

  constructor(message: string, statusCode: number = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function errorHandler(
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  console.error('[Error]', err);

  const isAppError = err instanceof AppError || (err && typeof (err as any).statusCode === 'number');
  if (isAppError) {
    const statusCode = (err as any).statusCode || 400;
    res.status(statusCode).json({
      error: err.message,
      ...((err as any).details ? { details: (err as any).details } : {})
    });
    return;
  }

  res.status(500).json({
    error: err.message || 'Wystąpił nieoczekiwany błąd po stronie serwera.',
    message: err.message || 'Wystąpił nieoczekiwany błąd po stronie serwera.'
  });
}
