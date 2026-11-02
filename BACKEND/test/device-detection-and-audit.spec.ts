import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { parseUserAgent } from '../src/common/device-detection/device-detector';
import { AuditLoggerService } from '../src/common/logger/audit-logger.service';

describe('Device Detection and Audit Logger Tests', () => {
  describe('Device Detection', () => {
    it('should accurately detect Windows Chrome', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Chrome');
      expect(result.browserVersion).toBe('120.0.0.0');
      expect(result.os).toBe('Windows');
      expect(result.osVersion).toBe('10/11');
      expect(result.deviceType).toBe('Desktop');
      expect(result.displayName).toBe('Chrome on Windows 10/11');
    });

    it('should accurately detect Linux Chrome without assuming Linux is mobile or Windows', () => {
      const ua =
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Linux');
      expect(result.deviceType).toBe('Desktop');
      expect(result.displayName).toBe('Chrome on Linux');
    });

    it('should accurately detect Android Chrome as Mobile', () => {
      const ua =
        'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Android');
      expect(result.osVersion).toBe('14');
      expect(result.deviceType).toBe('Mobile');
      expect(result.displayName).toBe('Chrome on Android 14');
    });

    it('should accurately detect iPhone Safari as Mobile', () => {
      const ua =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Safari');
      expect(result.browserVersion).toBe('17.2');
      expect(result.os).toBe('iOS');
      expect(result.osVersion).toBe('17.2');
      expect(result.deviceType).toBe('Mobile');
      expect(result.displayName).toBe('Safari on iOS 17.2');
    });

    it('should accurately detect iPad Safari as Tablet', () => {
      const ua =
        'Mozilla/5.0 (iPad; CPU OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Safari');
      expect(result.os).toBe('iPadOS');
      expect(result.deviceType).toBe('Tablet');
    });

    it('should accurately detect Microsoft Edge', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Microsoft Edge');
      expect(result.browserVersion).toBe('120.0.0.0');
      expect(result.os).toBe('Windows');
      expect(result.deviceType).toBe('Desktop');
    });

    it('should accurately detect Firefox', () => {
      const ua =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0';
      const result = parseUserAgent(ua);
      expect(result.browser).toBe('Firefox');
      expect(result.browserVersion).toBe('121.0');
      expect(result.os).toBe('Windows');
    });

    it('should provide honest fallback for missing or unknown User-Agent', () => {
      const emptyResult = parseUserAgent('');
      expect(emptyResult.browser).toBe('Unknown');
      expect(emptyResult.os).toBe('Unknown');
      expect(emptyResult.deviceType).toBe('Unknown device');
      expect(emptyResult.displayName).toBe('Unknown device');

      const nullResult = parseUserAgent(null);
      expect(nullResult.displayName).toBe('Unknown device');

      const crawlerResult = parseUserAgent('SomeRandomBot/1.0');
      expect(crawlerResult.browser).toBe('Unknown');
      expect(crawlerResult.os).toBe('Unknown');
      expect(crawlerResult.displayName).toBe('Unknown device');
    });
  });

  describe('Audit Logger Service', () => {
    let mockDb: any;
    let auditLogger: AuditLoggerService;

    beforeEach(() => {
      mockDb = {
        insert: jest.fn().mockReturnValue({
          values: jest.fn<any>().mockResolvedValue(undefined),
        }),
      };
      auditLogger = new AuditLoggerService(mockDb);
    });

    it('should persist a successful audit log record to PostgreSQL', async () => {
      await auditLogger.log({
        action: 'LOGIN_SUCCESS',
        actorUserId: 'user-1',
        actorUsername: 'rahul',
        targetType: 'USER',
        targetId: 'user-1',
        targetUsername: 'rahul',
        httpMethod: 'POST',
        route: '/auth/login',
        statusCode: 200,
        success: true,
        requestId: 'req-123',
        sessionId: 'sess-456',
        description: 'User logged in',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertMock = mockDb.insert();
      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_SUCCESS',
          actorUserId: 'user-1',
          actorUsername: 'rahul',
          targetType: 'USER',
          targetId: 'user-1',
          targetUsername: 'rahul',
          statusCode: 200,
          success: true,
          requestId: 'req-123',
          sessionId: 'sess-456',
        }),
      );
    });

    it('should record failed operations with failure status', async () => {
      await auditLogger.log({
        action: 'LOGIN_FAILED',
        actorUsername: 'rahul',
        targetType: 'USER',
        targetUsername: 'rahul',
        httpMethod: 'POST',
        route: '/auth/login',
        statusCode: 401,
        success: false,
        errorCode: 'UNAUTHORIZED',
        description: 'Invalid handle or password',
      });

      expect(mockDb.insert).toHaveBeenCalled();
      const insertMock = mockDb.insert();
      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LOGIN_FAILED',
          statusCode: 401,
          success: false,
          errorCode: 'UNAUTHORIZED',
        }),
      );
    });

    it('should distinguish LIKE_CREATED and LIKE_REMOVED with actor and target', async () => {
      await auditLogger.log({
        action: 'LIKE_CREATED',
        actorUserId: 'user-rahul',
        actorUsername: 'rahul',
        targetType: 'POST',
        targetId: 'post-101',
        targetUsername: 'asha',
        httpMethod: 'POST',
        route: '/posts/post-101/like',
        statusCode: 200,
        success: true,
      });

      const insertMock = mockDb.insert();
      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'LIKE_CREATED',
          actorUserId: 'user-rahul',
          actorUsername: 'rahul',
          targetType: 'POST',
          targetId: 'post-101',
          targetUsername: 'asha',
        }),
      );
    });

    it('should distinguish FOLLOW_CREATED and FOLLOW_REMOVED with actor and target', async () => {
      await auditLogger.log({
        action: 'FOLLOW_CREATED',
        actorUserId: 'user-rahul',
        actorUsername: 'rahul',
        targetType: 'USER',
        targetId: 'user-asha',
        targetUsername: 'asha',
        httpMethod: 'POST',
        route: '/users/user-asha/follow',
        statusCode: 200,
        success: true,
      });

      const insertMock = mockDb.insert();
      expect(insertMock.values).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'FOLLOW_CREATED',
          actorUserId: 'user-rahul',
          actorUsername: 'rahul',
          targetType: 'USER',
          targetId: 'user-asha',
          targetUsername: 'asha',
        }),
      );
    });

    it('should not throw or crash if DB persistence fails', async () => {
      mockDb.insert = jest.fn().mockImplementation(() => {
        throw new Error('Database connection dropped');
      });

      await expect(
        auditLogger.log({
          action: 'POST_CREATED',
          actorUserId: 'u1',
          success: true,
        }),
      ).resolves.not.toThrow();
    });
  });
});
