import { Module } from '@nestjs/common';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}