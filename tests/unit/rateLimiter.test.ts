// tests/unit/rateLimiter.test.ts
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../src/types/express-custom';

// Import rate limiters
import {
  projectRateLimit,
  taskRateLimit,
  bulkOperationRateLimit,
  inviteRateLimit,
  teamRateLimit,
} from '../../src/middleware/rateLimiter';

const mockRequest = (email: string = 'test@example.com'): Partial<AuthenticatedRequest> => ({
  user: { auth0Id: 'auth0|123', email },
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Rate Limiter Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('projectRateLimit', () => {
    it('should allow first request', () => {
      const req = mockRequest();
      const res = mockResponse();

      projectRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = { user: undefined } as any;
      const res = mockResponse();

      projectRateLimit(req, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should block after exceeding rate limit', () => {
      const req = mockRequest('ratelimit@example.com');
      const res = mockResponse();

      // Make 30 requests (the limit)
      for (let i = 0; i < 30; i++) {
        jest.clearAllMocks();
        projectRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
      }

      // 31st request should be blocked
      jest.clearAllMocks();
      projectRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many project requests. Please slow down.',
          retryAfter: expect.any(Number),
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should track limits separately per user', () => {
      const req1 = mockRequest('user1@example.com');
      const req2 = mockRequest('user2@example.com');
      const res = mockResponse();

      // User 1 makes 30 requests
      for (let i = 0; i < 30; i++) {
        projectRateLimit(req1 as AuthenticatedRequest, res as Response, mockNext);
      }

      // User 2 should still be allowed
      jest.clearAllMocks();
      projectRateLimit(req2 as AuthenticatedRequest, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe('taskRateLimit', () => {
    it('should allow up to 50 requests per minute', () => {
      const req = mockRequest('task@example.com');
      const res = mockResponse();

      // Make 50 requests (the limit)
      for (let i = 0; i < 50; i++) {
        jest.clearAllMocks();
        taskRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 51st request should be blocked
      jest.clearAllMocks();
      taskRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('bulkOperationRateLimit', () => {
    it('should allow up to 20 bulk operations per 5 minutes', () => {
      const req = mockRequest('bulk@example.com');
      const res = mockResponse();

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        jest.clearAllMocks();
        bulkOperationRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 21st request should be blocked
      jest.clearAllMocks();
      bulkOperationRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many bulk operations. Please wait before trying again.',
        })
      );
    });
  });

  describe('inviteRateLimit', () => {
    it('should allow up to 10 invites per 15 minutes', () => {
      const req = mockRequest('invite@example.com');
      const res = mockResponse();

      // Make 10 requests (the limit)
      for (let i = 0; i < 10; i++) {
        jest.clearAllMocks();
        inviteRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 11th request should be blocked
      jest.clearAllMocks();
      inviteRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Too many invitations sent. Please try again later.',
        })
      );
    });
  });

  describe('teamRateLimit', () => {
    it('should allow up to 20 team operations per minute', () => {
      const req = mockRequest('team@example.com');
      const res = mockResponse();

      // Make 20 requests (the limit)
      for (let i = 0; i < 20; i++) {
        jest.clearAllMocks();
        teamRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
        expect(mockNext).toHaveBeenCalled();
      }

      // 21st request should be blocked
      jest.clearAllMocks();
      teamRateLimit(req as AuthenticatedRequest, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(429);
    });
  });

  describe('retryAfter', () => {
    it('should include retryAfter in response when rate limited', () => {
      const req = mockRequest('retry@example.com');
      const res = mockResponse();

      // Exceed limit
      for (let i = 0; i < 31; i++) {
        projectRateLimit(req as AuthenticatedRequest, res as Response, mockNext);
      }

      const jsonCall = (res.json as jest.Mock).mock.calls[0][0];
      expect(jsonCall.retryAfter).toBeGreaterThan(0);
      expect(jsonCall.retryAfter).toBeLessThanOrEqual(60); // 60 seconds max for 1 minute window
    });
  });
});
