import { Module } from '@nestjs/common';
import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';
import { DataModule } from '../data/data.module';

@Module({
  imports: [DataModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}