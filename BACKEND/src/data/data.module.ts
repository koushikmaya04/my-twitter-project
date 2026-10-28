import { Module } from '@nestjs/common';
import { SOCIAL_FEED_REPOSITORY } from './repository/social-feed.repository.token';
import { SOCIAL_FEED_READ_FAILURE } from './repository/social-feed-read-failure.token';
import { DrizzleSocialFeedRepository } from './repository/drizzle-social-feed.repository';

@Module({
  providers: [
    {
      provide: SOCIAL_FEED_REPOSITORY,
      useClass: DrizzleSocialFeedRepository,
    },
  {
  provide: SOCIAL_FEED_READ_FAILURE,
  useValue: () => false,
},
  ],
  exports: [
    SOCIAL_FEED_REPOSITORY,
    SOCIAL_FEED_READ_FAILURE,
  ],
})
export class DataModule {}