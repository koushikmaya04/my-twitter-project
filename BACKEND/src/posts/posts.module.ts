
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { DataModule } from '../data/data.module';

import { PostsController } from './posts.controller';
import { PostsService } from './posts.service';

@Module({
  imports: [DataModule, AuthModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
