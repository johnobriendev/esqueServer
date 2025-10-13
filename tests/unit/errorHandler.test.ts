// tests/unit/errorHandler.test.ts
import { Request, Response, NextFunction } from 'express';
import { errorHandler } from '../../src/middleware/errorHandler';

interface AppError extends Error {
  statusCode?: number;
}

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
    const error: AppError = new Error('Test error');
    error.statusCode = 404;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Test error',
      stack: undefined,
    });
  });

  it('should default to 500 status code when not provided', () => {
    const error: AppError = new Error('Internal error');

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal error',
      stack: undefined,
    });
  });

  it('should include stack trace in development environment', () => {
    process.env.NODE_ENV = 'development';

    const error: AppError = new Error('Dev error');
    error.statusCode = 400;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Dev error',
      stack: error.stack,
    });
  });

  it('should NOT include stack trace in production environment', () => {
    process.env.NODE_ENV = 'production';

    const error: AppError = new Error('Prod error');
    error.statusCode = 400;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Prod error',
      stack: undefined,
    });
  });

  it('should handle errors without message', () => {
    const error: AppError = new Error();
    error.statusCode = 500;

    const req = mockRequest();
    const res = mockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Internal Server Error', // Default message when error.message is empty
      stack: undefined,
    });
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

      const error: AppError = new Error(message);
      error.statusCode = code;

      const req = mockRequest();
      const res = mockResponse();

      errorHandler(error, req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(code);
      expect(res.json).toHaveBeenCalledWith({
        status: 'error',
        message,
        stack: undefined,
      });
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

    expect(callArg).toHaveProperty('status', 'error');
    expect(callArg).toHaveProperty('message', 'Custom error');
    expect(callArg).not.toHaveProperty('customField');
  });
});
