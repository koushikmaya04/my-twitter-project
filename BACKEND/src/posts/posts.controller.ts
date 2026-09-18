import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Put,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

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

  @Get(':id/replies')
  async listReplies(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const validId = validateUuid(id);
    const cursor =
      typeof request.query.cursor === 'string'
        ? request.query.cursor
        : null;
    const limit =
      typeof request.query.limit === 'string'
        ? Math.min(
            50,
            Math.max(1, parseInt(request.query.limit, 10) || 10),
          )
        : 10;

    return this.postsService.listReplies(
      validId,
      cursor,
      limit,
    );
  }

  @Post()
  async createPost(
    @Body()
    body: {
      kind?: 'original' | 'reply' | 'repost';
      text?: string;
      replyToId?: string;
      repostOfId?: string;
    },
  ) {
    const kind = body.kind ?? 'original';

    return this.postsService.createPost({
      kind,
      text: body.text,
      replyToId: body.replyToId
        ? validateUuid(body.replyToId)
        : undefined,
      repostOfId: body.repostOfId
        ? validateUuid(body.repostOfId)
        : undefined,
    });
  }

  @Put(':id/like')
  async setLikePut(
    @Param('id') id: string,
    @Body() body: { desiredState?: boolean },
  ) {
    const validId = validateUuid(id);
    const desiredState =
      typeof body?.desiredState === 'boolean'
        ? body.desiredState
        : true;

    return this.postsService.setLike(
      validId,
      desiredState,
    );
  }

  @Post(':id/like')
  async setLikePost(
    @Param('id') id: string,
    @Body() body: { desiredState?: boolean },
  ) {
    const validId = validateUuid(id);
    const desiredState =
      typeof body?.desiredState === 'boolean'
        ? body.desiredState
        : true;

    return this.postsService.setLike(
      validId,
      desiredState,
    );
  }

  @Delete(':id/like')
  async setLikeDelete(@Param('id') id: string) {
    const validId = validateUuid(id);

    return this.postsService.setLike(
      validId,
      false,
    );
  }
}