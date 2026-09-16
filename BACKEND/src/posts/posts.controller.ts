import {
  Controller,
  Get,
  NotFoundException,
  Param,
} from '@nestjs/common';

import { PostsService } from './posts.service';
import { validateUuid } from '../common/errors/uuid.validation';

@Controller('posts')
export class PostsController {
  constructor(
    private readonly postsService: PostsService,
  ) {}

  @Get(':id')
  async getPostById(@Param('id') id: string) {
    const validId = validateUuid(id);

    const post =
      await this.postsService.getPostById(validId);

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      item: post,
    };
  }
}