import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { DataModule } from '../data/data.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DataModule, AuthModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}
