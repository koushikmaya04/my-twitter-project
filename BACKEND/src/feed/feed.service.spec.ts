import { jest } from '@jest/globals';
import { FeedService } from './feed.service';
import type { ConfigService } from '@nestjs/config';

import type {
  PaginatedResult,
  PostRecord,
  SocialFeedRepository,
} from '../data/repository/social-feed.repository';

describe('FeedService', () => {
  it('uses the repository to get the feed', async () => {
    const fakeResult: PaginatedResult<PostRecord> = {
      items: [],
      nextCursor: 'fake-next-cursor',
      hasMore: true,
    };

    const mockConfigService = {
      getOrThrow: jest
        .fn<ConfigService['getOrThrow']>()
        .mockReturnValue('demo-user-id'),
    } as unknown as ConfigService;

    const listOriginalFeed = jest
      .fn<SocialFeedRepository['listOriginalFeed']>()
      .mockResolvedValue(fakeResult);

    const fakeRepository = {
      listOriginalFeed,
    } as unknown as SocialFeedRepository;

    const service = new FeedService(
      mockConfigService,
      fakeRepository,
    );

    const result = await service.getFeed(null, 10);

    expect(result).toEqual(fakeResult);

    expect(listOriginalFeed).toHaveBeenCalledWith(
      null,
      10,
      'demo-user-id',
    );
  });
});