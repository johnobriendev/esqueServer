import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { errorHandler, AppError } from '../../src/middleware/errorHandler';

const mockRequest = (): Partial<Request> => ({});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Error Handler Middleware Unit Tests', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
  });

  it('should return error with status code from error object', () => {
    const error: any = new Error('Test error');
    error.statusCode = 404;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Test error' });
  });

  it('should default to 500 status code when not provided', () => {
    const error = new Error('Internal error');

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal error' });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';

    const error: any = new Error('Dev error');
    error.statusCode = 400;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      error: 'Dev error',
      stack: error.stack,
    });
  });

  it('should NOT include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';

    const error: any = new Error('Prod error');
    error.statusCode = 400;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({ error: 'Prod error' });
  });

  it('should handle errors without message', () => {
    const error: any = new Error();
    error.statusCode = 500;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({ error: 'Internal Server Error' });
  });

  it('should handle various HTTP error codes', () => {
    const testCases = [
      { code: 400, message: 'Bad Request' },
      { code: 401, message: 'Unauthorized' },
      { code: 403, message: 'Forbidden' },
      { code: 404, message: 'Not Found' },
      { code: 500, message: 'Internal Server Error' },
    ];

    testCases.forEach(({ code, message }) => {
      jest.clearAllMocks();

      const error: any = new Error(message);
      error.statusCode = code;

      const req = mockRequest();
      const res = mockResponse();

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(code);
      expect(res.json).toHaveBeenCalledWith({ error: message });
    });
  });

  it('should handle errors with custom properties', () => {
    const error: any = new Error('Custom error');
    error.statusCode = 422;
    error.customField = 'should be ignored';

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    const callArg = (res.json as jest.Mock).mock.calls[0][0];

    expect(callArg).toHaveProperty('error', 'Custom error');
    expect(callArg).not.toHaveProperty('customField');
  });

  it('should handle AppError with correct status and message', () => {
    const error = new AppError(422, 'Unprocessable entity');

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({ error: 'Unprocessable entity' });
  });

  it('should return 404 for Prisma P2025 (not found)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Resource not found' });
  });

  it('should return 409 for Prisma P2002 (conflict)', () => {
    const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ error: 'Conflict: resource already exists' });
  });
});
