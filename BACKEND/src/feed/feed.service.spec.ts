import { jest } from '@jest/globals';
import { FeedService } from './feed.service';

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

    const getFeed = jest
      .fn<SocialFeedRepository['getFeed']>()
      .mockResolvedValue(fakeResult);

    const getPostById = jest
      .fn<SocialFeedRepository['getPostById']>()
      .mockResolvedValue(null);

    const getUserById = jest
      .fn<SocialFeedRepository['getUserById']>()
      .mockResolvedValue(null);

    const fakeRepository: SocialFeedRepository = {
      getFeed,
      getPostById,
      getUserById,
    };

    const service = new FeedService(fakeRepository);

    const result = await service.getFeed(null, 10);

    expect(result).toEqual(fakeResult);

    expect(getFeed).toHaveBeenCalledWith(null, 10);
  });
});