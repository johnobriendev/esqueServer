// tests/unit/auth.test.ts
import { Response, NextFunction } from 'express';
import { extractUserInfo } from '../../src/middleware/auth';
import { AuthenticatedRequest } from '../../src/types/express-custom';

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Auth Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('extractUserInfo', () => {
    it('should extract auth0Id and email from valid payload', async () => {
      const req = {
        auth: { payload: { sub: 'auth0|12345', email: 'test@example.com' } },
        headers: {},
      } as Partial<AuthenticatedRequest> as AuthenticatedRequest;
      const res = mockResponse();

      await extractUserInfo(req, res as Response, mockNext);

      expect(req.user).toEqual({ auth0Id: 'auth0|12345', email: 'test@example.com' });
      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 401 when auth payload is missing', async () => {
      const req = { auth: undefined, headers: {} } as any;
      const res = mockResponse();

      await extractUserInfo(req, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Invalid authentication token' });
    });

    it('should return 401 when sub is missing', async () => {
      const req = { auth: { payload: {} }, headers: {} } as any;
      const res = mockResponse();

      await extractUserInfo(req, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should fallback to x-user-email header when email not in payload', async () => {
      const req = {
        auth: { payload: { sub: 'auth0|12345' } },
        headers: { 'x-user-email': 'header@example.com' },
      } as any;
      const res = mockResponse();

      await extractUserInfo(req, res as Response, mockNext);

      expect(req.user.email).toBe('header@example.com');
      expect(mockNext).toHaveBeenCalled();
    });

    it('should generate fallback email when all sources missing', async () => {
      const req = {
        auth: { payload: { sub: 'auth0|12345' } },
        headers: {},
      } as any;
      const res = mockResponse();

      await extractUserInfo(req, res as Response, mockNext);

      expect(req.user.email).toBe('auth0_12345@example.com');
    });

    it('should call next with error on exception', async () => {
      const req = {
        auth: { payload: { sub: 'auth0|12345', email: 'test@example.com' } },
        headers: {},
      } as any;
      const res = mockResponse();
      const error = new Error('Test error');

      Object.defineProperty(req, 'user', {
        set: () => { throw error; },
        configurable: true,
      });

      await extractUserInfo(req, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
