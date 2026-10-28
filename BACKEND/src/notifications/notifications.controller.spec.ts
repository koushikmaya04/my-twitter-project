import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';
import type {
  NotificationItemDto,
  NotificationListResponseDto,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  const mockListResponse: NotificationListResponseDto = {
    items: [],
    nextCursor: null,
    hasMore: false,
  };

  const mockUnreadCountResponse: UnreadCountResponseDto = {
    unreadCount: 3,
    count: 3,
  };

  const mockNotificationItem: NotificationItemDto = {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'follow',
    isRead: false,
    readAt: null,
    createdAt: new Date().toISOString(),
    actor: {
      id: '22222222-2222-4222-8222-222222222222',
      handle: 'actor_user',
      displayName: 'Actor User',
      avatar: {
        smallUrl: '/fixtures/actor_user-48.jpg',
        largeUrl: '/fixtures/actor_user-96.jpg',
      },
    },
    post: null,
    reply: null,
  };

  const notificationsService = {
    listNotifications: jest.fn<NotificationsService['listNotifications']>(),
    getUnreadCount: jest.fn<NotificationsService['getUnreadCount']>(),
    markAsRead: jest.fn<NotificationsService['markAsRead']>(),
    markAllAsRead: jest.fn<NotificationsService['markAllAsRead']>(),
  };

  const sessionGuard = {
    canActivate: jest.fn<() => Promise<boolean>>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    notificationsService.listNotifications.mockResolvedValue(mockListResponse);
    notificationsService.getUnreadCount.mockResolvedValue(
      mockUnreadCountResponse,
    );
    notificationsService.markAsRead.mockResolvedValue(mockNotificationItem);
    notificationsService.markAllAsRead.mockResolvedValue({ updatedCount: 2 });
    sessionGuard.canActivate.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: notificationsService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue(sessionGuard)
      .compile();

    controller = module.get<NotificationsController>(NotificationsController);
  });

  it('uses the session guard on the controller class', () => {
    const guards = Reflect.getMetadata('__guards__', NotificationsController);
    expect(guards).toContain(SessionGuard);
  });

  describe('GET /notifications', () => {
    it('returns the notifications list for the authenticated viewer', async () => {
      const viewerId = 'viewer-123';
      const request = {
        query: {},
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      await expect(controller.listNotifications(request)).resolves.toEqual(
        mockListResponse,
      );

      expect(notificationsService.listNotifications).toHaveBeenCalledWith(
        viewerId,
        null,
        10,
      );
    });

    it('passes limit and cursor to the service', async () => {
      const viewerId = 'viewer-123';
      const request = {
        query: { limit: '5' },
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      await controller.listNotifications(request);

      expect(notificationsService.listNotifications).toHaveBeenCalledWith(
        viewerId,
        null,
        5,
      );
    });

    it('rejects an invalid limit query parameter', async () => {
      const request = {
        query: { limit: '999' },
        user: { id: 'viewer-123' },
      } as unknown as AuthenticatedRequest;

      await expect(controller.listNotifications(request)).rejects.toThrow(
        BadRequestException,
      );

      expect(notificationsService.listNotifications).not.toHaveBeenCalled();
    });
  });

  describe('GET /notifications/unread-count', () => {
    it('returns authoritative unread count for the authenticated viewer', async () => {
      const viewerId = 'viewer-123';
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getUnreadCount(request)).resolves.toEqual(
        mockUnreadCountResponse,
      );

      expect(notificationsService.getUnreadCount).toHaveBeenCalledWith(
        viewerId,
      );
    });
  });

  describe('mark-one-read (PATCH /:id/read and POST /:id/read)', () => {
    const validId = '11111111-1111-4111-8111-111111111111';
    const viewerId = 'viewer-123';

    it('PATCH marks a single notification as read', async () => {
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      const result = await controller.markOneAsReadPatch(validId, request);

      expect(result).toEqual({ item: mockNotificationItem });
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        validId,
        viewerId,
      );
    });

    it('POST marks a single notification as read', async () => {
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      const result = await controller.markOneAsReadPost(validId, request);

      expect(result).toEqual({ item: mockNotificationItem });
      expect(notificationsService.markAsRead).toHaveBeenCalledWith(
        validId,
        viewerId,
      );
    });

    it('rejects a malformed notification UUID', async () => {
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      await expect(
        controller.markOneAsReadPatch('not-a-uuid', request),
      ).rejects.toThrow(BadRequestException);

      expect(notificationsService.markAsRead).not.toHaveBeenCalled();
    });
  });

  describe('mark-all-read (POST /read-all and PATCH /read-all)', () => {
    const viewerId = 'viewer-123';

    it('POST marks all notifications as read', async () => {
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      const result = await controller.markAllAsReadPost(request);

      expect(result).toEqual({ updatedCount: 2 });
      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(viewerId);
    });

    it('PATCH marks all notifications as read', async () => {
      const request = {
        user: { id: viewerId },
      } as unknown as AuthenticatedRequest;

      const result = await controller.markAllAsReadPatch(request);

      expect(result).toEqual({ updatedCount: 2 });
      expect(notificationsService.markAllAsRead).toHaveBeenCalledWith(viewerId);
    });
  });
});
