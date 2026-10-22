import { jest } from '@jest/globals';
import type { FeedResponseDto } from './dto/feed-response.dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Request } from 'express';

import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { SessionGuard } from '../auth/session.guard';
import type { AuthenticatedRequest } from '../auth/authenticated-request';

describe('FeedController', () => {
  let controller: FeedController;

  const feedResponse = {
    items: [],
    nextCursor: null,
    hasMore: false,
  };
  const feedService = {
    getFeed: jest.fn<FeedService['getFeed']>(),
    getHomeFeed: jest.fn<FeedService['getHomeFeed']>(),
  };

  const sessionGuard = {
    canActivate: jest.fn<() => Promise<boolean>>(),
  };
  beforeEach(async () => {
    jest.clearAllMocks();

    feedService.getFeed.mockResolvedValue(feedResponse);
    feedService.getHomeFeed.mockResolvedValue(feedResponse);
    sessionGuard.canActivate.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        {
          provide: FeedService,
          useValue: feedService,
        },
      ],
    })
      .overrideGuard(SessionGuard)
      .useValue(sessionGuard)
      .compile();

    controller = module.get<FeedController>(FeedController);
  });

  describe('GET /feed', () => {
    it('returns the public feed using default query parameters', async () => {
      const request = {
        query: {},
      } as Request;

      await expect(controller.getFeed(request)).resolves.toEqual(feedResponse);

      expect(feedService.getFeed).toHaveBeenCalledWith(null, 10);
    });

    it('passes the default cursor and requested limit to the service', async () => {
      const request = {
        query: { limit: '5' },
      } as unknown as Request;

      await controller.getFeed(request);

      expect(feedService.getFeed).toHaveBeenCalledWith(null, 5);
    });

    it('rejects an invalid limit', async () => {
      const request = {
        query: {
          limit: '100',
        },
      } as unknown as Request;

      await expect(controller.getFeed(request)).rejects.toThrow(
        BadRequestException,
      );

      expect(feedService.getFeed).not.toHaveBeenCalled();
    });
  });

  describe('GET /feed/home', () => {
    it('returns the personalized feed for the authenticated viewer', async () => {
      const viewerId = 'viewer-123';

      const request = {
        query: {},
        user: {
          id: viewerId,
        },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getHomeFeed(request)).resolves.toEqual(
        feedResponse,
      );

      expect(feedService.getHomeFeed).toHaveBeenCalledWith(null, 10, viewerId);
    });

    it('passes the requested limit and viewer ID to the service', async () => {
      const request = {
        query: { limit: '5' },
        user: { id: 'viewer-456' },
      } as unknown as AuthenticatedRequest;

      await controller.getHomeFeed(request);

      expect(feedService.getHomeFeed).toHaveBeenCalledWith(
        null,
        5,
        'viewer-456',
      );
    });

    it('rejects invalid query parameters before calling the service', async () => {
      const request = {
        query: {
          limit: '0',
        },
        user: {
          id: 'viewer-123',
        },
      } as unknown as AuthenticatedRequest;

      await expect(controller.getHomeFeed(request)).rejects.toThrow(
        BadRequestException,
      );

      expect(feedService.getHomeFeed).not.toHaveBeenCalled();
    });
  });

  it('uses the session guard for the home-feed route', () => {
    expect(sessionGuard.canActivate).not.toHaveBeenCalled();

    // The guard is registered as route metadata and runs in NestJS's
    // request pipeline, rather than when the controller method is called directly.
    expect(
      Reflect.getMetadata('__guards__', FeedController.prototype.getHomeFeed),
    ).toContain(SessionGuard);
  });
});
