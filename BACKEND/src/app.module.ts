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

import { RequestLoggingMiddleware } from './common/request-logging/request-logging.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),

    HealthModule,

    UsersModule,

    PostsModule,

    FeedModule,
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