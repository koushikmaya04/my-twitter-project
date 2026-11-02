import { Test, TestingModule } from '@nestjs/testing';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import * as argon2 from 'argon2';

import { NotFoundException, UnauthorizedException } from '@nestjs/common';

import { AuthService } from './auth.service';
import { DATABASE } from '../database/database.provider';
import { sessions, users } from '../database/schema';

function mockResolvedValue(value: unknown) {
  return jest
    .fn<(...args: any[]) => Promise<unknown>>()
    .mockResolvedValue(value);
}

describe('AuthService', () => {
  let service: AuthService;
  let db: any;

  beforeEach(async () => {
    db = {
      transaction: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DATABASE,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deactivate', () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

    it('should deactivate the account and revoke active sessions', async () => {
      const userUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: mockResolvedValue([{ id: userId }]),
      };

      const sessionUpdate = {
        set: jest.fn().mockReturnThis(),
        where: mockResolvedValue(undefined),
      };

      const tx = {
        update: jest
          .fn()
          .mockReturnValueOnce(userUpdate)
          .mockReturnValueOnce(sessionUpdate),
      };

      db.transaction.mockImplementation(
        async (callback: (transaction: any) => Promise<void>) => callback(tx),
      );

      await service.deactivate(userId);

      expect(db.transaction).toHaveBeenCalledTimes(1);

      expect(tx.update).toHaveBeenNthCalledWith(1, users);
      expect(userUpdate.set).toHaveBeenCalledWith(
        expect.objectContaining({
          deactivatedAt: expect.any(Date),
          updatedAt: expect.any(Date),
        }),
      );

      expect(userUpdate.returning).toHaveBeenCalledWith({
        id: users.id,
      });

      expect(tx.update).toHaveBeenNthCalledWith(2, sessions);
      expect(sessionUpdate.set).toHaveBeenCalledWith({
        revokedAt: expect.any(Date),
      });
    });

    it('should reject when no active account exists', async () => {
      const userUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: mockResolvedValue([]),
      };

      const tx = {
        update: jest.fn().mockReturnValue(userUpdate),
      };

      db.transaction.mockImplementation(
        async (callback: (transaction: any) => Promise<void>) => callback(tx),
      );

      await expect(service.deactivate(userId)).rejects.toThrow(
        NotFoundException,
      );

      // Sessions must not be updated when the account update fails.
      expect(tx.update).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('should reject login for a deactivated account', async () => {
      const passwordHash = await argon2.hash('valid-password');

      const deactivatedUser = {
        id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        handle: 'maya',
        displayName: 'Maya',
        createdAt: new Date(),
        passwordHash,
        deactivatedAt: new Date(),
      };

      const query = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolvedValue([deactivatedUser]),
      };

      db.select.mockReturnValue(query);

      await expect(
        service.login({
          handle: 'maya',
          password: 'valid-password',
        }),
      ).rejects.toThrow(UnauthorizedException);

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('me', () => {
    it('should reject a session that no longer resolves to an active user', async () => {
      const query = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolvedValue([]),
      };

      db.select.mockReturnValue(query);

      await expect(service.me('session=old-session-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should reject a request without a session cookie', async () => {
      await expect(service.me()).rejects.toThrow(UnauthorizedException);

      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('sessions management', () => {
    const userId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const sessionId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    it('should list active sessions with isCurrent flag', async () => {
      const now = new Date();
      const mockSessionsList = [
        {
          id: sessionId,
          createdAt: now,
          expiresAt: new Date(now.getTime() + 1000000),
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          ipAddress: '127.0.0.1',
          tokenHash: (service as any).hashToken('my-current-token'),
        },
      ];

      const query = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: mockResolvedValue(mockSessionsList),
      };
      db.select.mockReturnValue(query);

      const result = await service.getSessions(userId, 'session=my-current-token');

      expect(result.count).toBe(1);
      expect(result.items[0].id).toBe(sessionId);
      expect(result.items[0].isCurrent).toBe(true);
      expect(result.items[0].browser).toBe('Chrome');
      expect(result.items[0].os).toBe('Windows 10/11');
      expect(result.items[0].deviceType).toBe('desktop');
    });

    it('should revoke a session by id', async () => {
      const mockSession = {
        id: sessionId,
        userId,
        tokenHash: (service as any).hashToken('other-token'),
        revokedAt: null,
        expiresAt: new Date(Date.now() + 1000000),
      };

      const query = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolvedValue([mockSession]),
      };
      db.select.mockReturnValue(query);

      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: mockResolvedValue(undefined),
      };
      db.update.mockReturnValue(updateQuery);

      const result = await service.revokeSession(userId, sessionId, 'session=my-current-token');

      expect(result.revoked).toBe(true);
      expect(result.isCurrent).toBe(false);
      expect(db.update).toHaveBeenCalledWith(sessions);
    });

    it('should throw NotFoundException when revoking non-existent session', async () => {
      const query = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolvedValue([]),
      };
      db.select.mockReturnValue(query);

      await expect(
        service.revokeSession(userId, 'invalid-session-id', 'session=my-current-token'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should revoke all other sessions preserving current session', async () => {
      const currentToken = 'current-session-token';
      const currentTokenHash = (service as any).hashToken(currentToken);

      const query = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolvedValue([{ id: sessionId }]),
      };
      db.select.mockReturnValue(query);

      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: mockResolvedValue([{ id: 'other-session-1' }, { id: 'other-session-2' }]),
      };
      db.update.mockReturnValue(updateQuery);

      const result = await service.revokeOtherSessions(userId, 'session=' + currentToken);

      expect(result.revokedCount).toBe(2);
      expect(db.update).toHaveBeenCalledWith(sessions);
    });
  });
});
