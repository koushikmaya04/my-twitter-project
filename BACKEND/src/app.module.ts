import {
  MiddlewareConsumer,
  Module,
} from '@nestjs/common';

import { ConfigModule } from '@nestjs/config';

import configuration from './config/configuration';

import { RequestIdMiddleware } from './common/request-logging/request-id.middleware';

import { HealthModule } from './health/health.module';

import { UsersModule } from './users/users.module';

import { PostsModule } from './posts/posts.module';

import { FeedModule } from './feed/feed.module';

import { SearchModule } from './search/search.module';

import { RequestLoggingMiddleware } from './common/request-logging/request-logging.middleware';

import { DatabaseModule } from './database/database.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    DatabaseModule, 

    HealthModule,

    UsersModule,

    PostsModule,

    FeedModule,

    SearchModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
     .apply(
  RequestIdMiddleware,
  RequestLoggingMiddleware,
)
.forRoutes('*');
  }
}