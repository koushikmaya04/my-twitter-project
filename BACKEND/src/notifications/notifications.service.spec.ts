import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationsService } from './notifications.service';
import { DATABASE } from '../database/database.provider';
import { NotFoundDomainError } from '../common/errors/domain-errors';

const mockResolved = (value: unknown) =>
  jest.fn<(...args: any[]) => Promise<any>>().mockResolvedValue(value);

describe('NotificationsService', () => {
  let service: NotificationsService;
  let db: any;

  beforeEach(async () => {
    db = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: DATABASE,
          useValue: db,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listNotifications', () => {
    const recipientId = '11111111-1111-4111-8111-111111111111';

    it('returns empty list when no notifications exist', async () => {
      const query = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: mockResolved([]),
      };

      db.select.mockReturnValue(query);

      const result = await service.listNotifications(recipientId, null, 10);

      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextCursor).toBeNull();
    });

    it('returns mapped notifications and computes nextCursor', async () => {
      const now = new Date();
      const mockRows = [
        {
          id: '22222222-2222-4222-8222-222222222222',
          type: 'like',
          isRead: false,
          readAt: null,
          createdAt: now,
          actorId: '33333333-3333-4333-8333-333333333333',
          actorHandle: 'test_actor',
          actorDisplayName: 'Test Actor',
          actorSmallUrl: null,
          actorLargeUrl: null,
          postId: '44444444-4444-4444-8444-444444444444',
          postKind: 'original',
          postText: 'Hello world',
          postCreatedAt: now,
          replyId: null,
          replyText: null,
          replyCreatedAt: null,
        },
      ];

      const query = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: mockResolved(mockRows),
      };

      db.select.mockReturnValue(query);

      const result = await service.listNotifications(recipientId, null, 10);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('22222222-2222-4222-8222-222222222222');
      expect(result.items[0].type).toBe('like');
      expect(result.items[0].actor.handle).toBe('test_actor');
      expect(result.items[0].post?.text).toBe('Hello world');
      expect(result.hasMore).toBe(false);
    });
  });

  describe('getUnreadCount', () => {
    it('returns the authoritative unread count', async () => {
      const query = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: mockResolved([{ count: 5 }]),
      };

      db.select.mockReturnValue(query);

      const result = await service.getUnreadCount(
        '11111111-1111-4111-8111-111111111111',
      );

      expect(result.unreadCount).toBe(5);
      expect(result.count).toBe(5);
    });
  });

  describe('markAsRead', () => {
    const notificationId = '22222222-2222-4222-8222-222222222222';
    const recipientId = '11111111-1111-4111-8111-111111111111';

    it('marks a notification as read when owned by the recipient', async () => {
      const selectInitial = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolved([{ id: notificationId, recipientId }]),
      };

      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: mockResolved([]),
      };

      const now = new Date();
      const selectFinal = {
        from: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolved([
  {
    id: notificationId,
    type: 'follow',
    isRead: true,
    readAt: now,
    createdAt: now,
    actorId: '33333333-3333-4333-8333-333333333333',
    actorHandle: 'test_actor',
    actorDisplayName: 'Test Actor',
    actorSmallUrl: null,
    actorLargeUrl: null,
    postId: null,
    postKind: null,
    postText: null,
    postCreatedAt: null,
    replyId: null,
    replyText: null,
    replyCreatedAt: null,
  },
]),
      };

      db.select
        .mockReturnValueOnce(selectInitial)
        .mockReturnValueOnce(selectFinal);
      db.update.mockReturnValue(updateQuery);

      const result = await service.markAsRead(notificationId, recipientId);

      expect(result.id).toBe(notificationId);
      expect(result.isRead).toBe(true);
      expect(db.update).toHaveBeenCalled();
    });

    it('rejects cross-user update with ForbiddenException without changing state', async () => {
      const selectInitial = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
       limit: mockResolved([
  {
    id: notificationId,
    recipientId: 'different-user-uuid',
  },
]),
      };

      db.select.mockReturnValueOnce(selectInitial);

      await expect(
        service.markAsRead(notificationId, recipientId),
      ).rejects.toThrow(ForbiddenException);

      expect(db.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundDomainError when notification does not exist', async () => {
      const selectInitial = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: mockResolved([]),
      };

      db.select.mockReturnValueOnce(selectInitial);

      await expect(
        service.markAsRead(notificationId, recipientId),
      ).rejects.toThrow(NotFoundDomainError);

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('markAllAsRead', () => {
    it('marks all eligible unread notifications as read using snapshot cutoff', async () => {
      const recipientId = '11111111-1111-4111-8111-111111111111';

      const updateQuery = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: mockResolved([
  { id: 'notif-1' },
  { id: 'notif-2' },
]),
      };

      db.update.mockReturnValue(updateQuery);

      const result = await service.markAllAsRead(recipientId);

      expect(result.updatedCount).toBe(2);
      expect(db.update).toHaveBeenCalled();
    });
  });
});
