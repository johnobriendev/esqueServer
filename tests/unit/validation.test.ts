// tests/unit/validation.test.ts
import { Request, Response, NextFunction } from 'express';
import {
  validateProjectData,
  validateTaskData,
  validateBulkUpdateData,
  validateReorderData,
  validateCommentData,
} from '../../src/middleware/validation';

// Mock Express objects
const mockRequest = (body: any = {}): Partial<Request> => ({
  body,
});

const mockResponse = (): Partial<Response> => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const mockNext: NextFunction = jest.fn();

describe('Validation Middleware Unit Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateProjectData', () => {
    it('should pass validation with valid project data', () => {
      const req = mockRequest({ name: 'Test Project', description: 'Test Description' });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should fail when name is missing', () => {
      const req = mockRequest({ description: 'Test Description' });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project name is required' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should fail when name is empty string', () => {
      const req = mockRequest({ name: '' });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Project name is required' });
    });

    it('should fail when name is only whitespace', () => {
      const req = mockRequest({ name: '   ' });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when name exceeds 100 characters', () => {
      const req = mockRequest({ name: 'A'.repeat(101) });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Project name is too long (max 100 characters)'
      });
    });

    it('should fail when description exceeds 500 characters', () => {
      const req = mockRequest({ name: 'Valid', description: 'A'.repeat(501) });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Project description is too long (max 500 characters)'
      });
    });

    it('should pass with valid name and no description', () => {
      const req = mockRequest({ name: 'Valid Project' });
      const res = mockResponse();

      validateProjectData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('validateTaskData', () => {
    it('should pass validation with valid task data', () => {
      const req = mockRequest({
        title: 'Test Task',
        description: 'Description',
        status: 'not started',
        priority: 'medium',
        position: 0,
      });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when title is missing', () => {
      const req = mockRequest({});
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Task title is required' });
    });

    it('should fail when title exceeds 200 characters', () => {
      const req = mockRequest({ title: 'A'.repeat(201) });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when description exceeds 2000 characters', () => {
      const req = mockRequest({ title: 'Valid', description: 'A'.repeat(2001) });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail with invalid status', () => {
      const req = mockRequest({ title: 'Valid', status: 'invalid' });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid status. Must be one of: not started, in progress, completed'
      });
    });

    it('should pass with valid status values', () => {
      const validStatuses = ['not started', 'in progress', 'completed'];

      validStatuses.forEach(status => {
        jest.clearAllMocks();
        const req = mockRequest({ title: 'Valid', status });
        const res = mockResponse();

        validateTaskData(req as Request, res as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should fail with invalid priority', () => {
      const req = mockRequest({ title: 'Valid', priority: 'super-urgent' });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Invalid priority. Must be one of: none, low, medium, high, urgent'
      });
    });

    it('should pass with valid priority values', () => {
      const validPriorities = ['none', 'low', 'medium', 'high', 'urgent'];

      validPriorities.forEach(priority => {
        jest.clearAllMocks();
        const req = mockRequest({ title: 'Valid', priority });
        const res = mockResponse();

        validateTaskData(req as Request, res as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });
    });

    it('should fail when position is negative', () => {
      const req = mockRequest({ title: 'Valid', position: -1 });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when position is not a number', () => {
      const req = mockRequest({ title: 'Valid', position: 'not-a-number' });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when customFields exceed size limit', () => {
      const largeObject = { data: 'x'.repeat(10001) };
      const req = mockRequest({ title: 'Valid', customFields: largeObject });
      const res = mockResponse();

      validateTaskData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateBulkUpdateData', () => {
    it('should pass with valid bulk update data', () => {
      const req = mockRequest({
        taskIds: ['id1', 'id2'],
        updates: { status: 'completed' },
      });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when taskIds is not an array', () => {
      const req = mockRequest({ taskIds: 'not-array', updates: {} });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when taskIds is empty', () => {
      const req = mockRequest({ taskIds: [], updates: {} });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when updates is missing', () => {
      const req = mockRequest({ taskIds: ['id1'] });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when no update fields provided', () => {
      const req = mockRequest({ taskIds: ['id1'], updates: {} });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail with invalid status in updates', () => {
      const req = mockRequest({
        taskIds: ['id1'],
        updates: { status: 'invalid' },
      });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail with invalid priority in updates', () => {
      const req = mockRequest({
        taskIds: ['id1'],
        updates: { priority: 'invalid' },
      });
      const res = mockResponse();

      validateBulkUpdateData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateReorderData', () => {
    it('should pass with valid reorder data', () => {
      const req = mockRequest({
        tasks: [
          { id: 'task1', position: 0 },
          { id: 'task2', position: 1 },
        ],
      });
      const res = mockResponse();

      validateReorderData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when tasks is not an array', () => {
      const req = mockRequest({ tasks: 'not-array' });
      const res = mockResponse();

      validateReorderData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when tasks array is empty', () => {
      const req = mockRequest({ tasks: [] });
      const res = mockResponse();

      validateReorderData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when task is missing id', () => {
      const req = mockRequest({
        tasks: [{ position: 0 }],
      });
      const res = mockResponse();

      validateReorderData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when task position is negative', () => {
      const req = mockRequest({
        tasks: [{ id: 'task1', position: -1 }],
      });
      const res = mockResponse();

      validateReorderData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateCommentData', () => {
    it('should pass with valid comment data', () => {
      const req = mockRequest({ content: 'This is a comment' });
      const res = mockResponse();

      validateCommentData(req as Request, res as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should fail when content is missing', () => {
      const req = mockRequest({});
      const res = mockResponse();

      validateCommentData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ error: 'Comment content is required' });
    });

    it('should fail when content is empty string', () => {
      const req = mockRequest({ content: '' });
      const res = mockResponse();

      validateCommentData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when content is only whitespace', () => {
      const req = mockRequest({ content: '   ' });
      const res = mockResponse();

      validateCommentData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should fail when content exceeds 2000 characters', () => {
      const req = mockRequest({ content: 'A'.repeat(2001) });
      const res = mockResponse();

      validateCommentData(req as Request, res as Response, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Comment is too long (max 2000 characters)'
      });
    });
  });
});
