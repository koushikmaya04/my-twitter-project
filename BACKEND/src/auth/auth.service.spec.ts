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
        returning: jest.fn().mockResolvedValue([{ id: userId }]),
      };

      const sessionUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue(undefined),
      };

      const tx = {
        update: jest
          .fn()
          .mockReturnValueOnce(userUpdate)
          .mockReturnValueOnce(sessionUpdate),
      };

      db.transaction.mockImplementation(
        async (callback: (transaction: any) => Promise<void>) =>
          callback(tx),
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
        returning: jest.fn().mockResolvedValue([]),
      };

      const tx = {
        update: jest.fn().mockReturnValue(userUpdate),
      };

      db.transaction.mockImplementation(
        async (callback: (transaction: any) => Promise<void>) =>
          callback(tx),
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
      limit: jest.fn().mockResolvedValue([deactivatedUser]),
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
        limit: jest.fn().mockResolvedValue([]),
      };

      db.select.mockReturnValue(query);

      await expect(
        service.me('session=old-session-token'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject a request without a session cookie', async () => {
      await expect(service.me()).rejects.toThrow(
        UnauthorizedException,
      );

      expect(db.select).not.toHaveBeenCalled();
    });
  });
});
