import type {
  PaginatedResponseDto,
  PostAuthorDto,
} from '../../feed/dto/feed-response.dto';

export type NotificationType = 'follow' | 'like' | 'reply' | 'repost';

export interface NotificationPostContextDto {
  id: string;
  kind: string;
  text: string | null;
  createdAt: string;
}

export interface NotificationItemDto {
  id: string;
  type: NotificationType;
  actor: PostAuthorDto;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  post?: NotificationPostContextDto | null;
  reply?: {
    id: string;
    text: string | null;
    createdAt: string;
  } | null;
}

export type NotificationListResponseDto =
  PaginatedResponseDto<NotificationItemDto>;

export interface UnreadCountResponseDto {
  unreadCount: number;
  count: number;
}

export interface MarkReadResponseDto {
  item: NotificationItemDto;
}

export interface MarkAllReadResponseDto {
  updatedCount: number;
}
