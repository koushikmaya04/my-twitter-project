import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, desc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';

import { DATABASE } from '../database/database.provider';
import { notifications, posts, users } from '../database/schema';
import { validateCursor } from '../common/cursor-validation/cursor.validation';
import { NotFoundDomainError } from '../common/errors/domain-errors';

import type {
  MarkAllReadResponseDto,
  NotificationItemDto,
  NotificationListResponseDto,
  NotificationType,
  UnreadCountResponseDto,
} from './dto/notification-response.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: any,
  ) {}

  private encodeCursor(createdAt: Date, id: string): string {
    return Buffer.from(
      JSON.stringify({
        v: 1,
        createdAt: createdAt.toISOString(),
        id,
      }),
    ).toString('base64url');
  }

  private getUserAvatar(
    handle: string,
    avatarSmallUrl?: string | null,
    avatarLargeUrl?: string | null,
  ) {
    const cleanHandle = handle.toLowerCase().replace(/^@/, '').trim();
    return {
      smallUrl: avatarSmallUrl ?? `/fixtures/${cleanHandle}-48.jpg`,
      largeUrl: avatarLargeUrl ?? `/fixtures/${cleanHandle}-96.jpg`,
    };
  }

  async listNotifications(
    recipientId: string,
    cursor: string | null,
    limit: number,
  ): Promise<NotificationListResponseDto> {
    const cursorValue = cursor ? validateCursor(cursor) : null;

    const replyPosts = alias(posts, 'reply_posts');

    const conditions = [
      eq(notifications.recipientId, recipientId),
      isNull(users.deactivatedAt),
      or(isNull(notifications.postId), isNull(posts.deletedAt)),
      or(isNull(notifications.replyId), isNull(replyPosts.deletedAt)),
    ];

    if (cursorValue) {
      const cursorDate = new Date(cursorValue.createdAt);
      conditions.push(
        or(
          lt(notifications.createdAt, cursorDate),
          and(
            eq(notifications.createdAt, cursorDate),
            lt(notifications.id, cursorValue.id),
          ),
        )!,
      );
    }

    const rows = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorHandle: users.handle,
        actorDisplayName: users.displayName,
        actorSmallUrl: users.avatarSmallUrl,
        actorLargeUrl: users.avatarLargeUrl,
        postId: posts.id,
        postKind: posts.kind,
        postText: posts.text,
        postCreatedAt: posts.createdAt,
        replyId: replyPosts.id,
        replyText: replyPosts.text,
        replyCreatedAt: replyPosts.createdAt,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .leftJoin(replyPosts, eq(notifications.replyId, replyPosts.id))
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = rows.slice(0, limit);

    const items: NotificationItemDto[] = pageRows.map((row: any) => ({
      id: row.id,
      type: row.type as NotificationType,
      isRead: row.isRead,
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      actor: {
        id: row.actorId,
        handle: row.actorHandle,
        displayName: row.actorDisplayName,
        avatar: this.getUserAvatar(
          row.actorHandle,
          row.actorSmallUrl,
          row.actorLargeUrl,
        ),
      },
      post: row.postId
        ? {
            id: row.postId,
            kind: row.postKind,
            text: row.postText,
            createdAt: new Date(row.postCreatedAt).toISOString(),
          }
        : null,
      reply: row.replyId
        ? {
            id: row.replyId,
            text: row.replyText,
            createdAt: new Date(row.replyCreatedAt).toISOString(),
          }
        : null,
    }));

    const lastRow = pageRows[pageRows.length - 1];

    return {
      items,
      hasMore,
      nextCursor:
        hasMore && lastRow
          ? this.encodeCursor(new Date(lastRow.createdAt), lastRow.id)
          : null,
    };
  }

  async getUnreadCount(recipientId: string): Promise<UnreadCountResponseDto> {
    const replyPosts = alias(posts, 'reply_posts');

    const [row] = await this.db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .leftJoin(replyPosts, eq(notifications.replyId, replyPosts.id))
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
          isNull(users.deactivatedAt),
          or(isNull(notifications.postId), isNull(posts.deletedAt)),
          or(isNull(notifications.replyId), isNull(replyPosts.deletedAt)),
        ),
      );

    const unreadCount = Number(row?.count ?? 0);
    return {
      unreadCount,
      count: unreadCount,
    };
  }

  async markAsRead(
    notificationId: string,
    recipientId: string,
  ): Promise<NotificationItemDto> {
    const existing = await this.db
      .select({
        id: notifications.id,
        recipientId: notifications.recipientId,
      })
      .from(notifications)
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundDomainError('Notification not found');
    }

    if (existing[0].recipientId !== recipientId) {
      throw new ForbiddenException(
        'You cannot modify another user’s notification',
      );
    }

    const now = new Date();

    await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: sql`COALESCE(${notifications.readAt}, ${now})`,
      })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.recipientId, recipientId),
        ),
      );

    const replyPosts = alias(posts, 'reply_posts');

    const [row] = await this.db
      .select({
        id: notifications.id,
        type: notifications.type,
        isRead: notifications.isRead,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
        actorId: users.id,
        actorHandle: users.handle,
        actorDisplayName: users.displayName,
        actorSmallUrl: users.avatarSmallUrl,
        actorLargeUrl: users.avatarLargeUrl,
        postId: posts.id,
        postKind: posts.kind,
        postText: posts.text,
        postCreatedAt: posts.createdAt,
        replyId: replyPosts.id,
        replyText: replyPosts.text,
        replyCreatedAt: replyPosts.createdAt,
      })
      .from(notifications)
      .innerJoin(users, eq(notifications.actorId, users.id))
      .leftJoin(posts, eq(notifications.postId, posts.id))
      .leftJoin(replyPosts, eq(notifications.replyId, replyPosts.id))
      .where(eq(notifications.id, notificationId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Notification could not be loaded');
    }

    return {
      id: row.id,
      type: row.type as NotificationType,
      isRead: row.isRead,
      readAt: row.readAt ? new Date(row.readAt).toISOString() : null,
      createdAt: new Date(row.createdAt).toISOString(),
      actor: {
        id: row.actorId,
        handle: row.actorHandle,
        displayName: row.actorDisplayName,
        avatar: this.getUserAvatar(
          row.actorHandle,
          row.actorSmallUrl,
          row.actorLargeUrl,
        ),
      },
      post: row.postId
        ? {
            id: row.postId,
            kind: row.postKind,
            text: row.postText,
            createdAt: new Date(row.postCreatedAt).toISOString(),
          }
        : null,
      reply: row.replyId
        ? {
            id: row.replyId,
            text: row.replyText,
            createdAt: new Date(row.replyCreatedAt).toISOString(),
          }
        : null,
    };
  }

  async markAllAsRead(recipientId: string): Promise<MarkAllReadResponseDto> {
    const cutoff = new Date();

    const updated = await this.db
      .update(notifications)
      .set({
        isRead: true,
        readAt: sql`COALESCE(${notifications.readAt}, ${cutoff})`,
      })
      .where(
        and(
          eq(notifications.recipientId, recipientId),
          eq(notifications.isRead, false),
          lte(notifications.createdAt, cutoff),
        ),
      )
      .returning({ id: notifications.id });

    return {
      updatedCount: updated.length,
    };
  }
}
