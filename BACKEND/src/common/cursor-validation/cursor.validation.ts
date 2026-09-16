import { BadRequestException } from '@nestjs/common';

const MAX_CURSOR_LENGTH = 1024;

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const BASE64URL_REGEX = /^[A-Za-z0-9_-]+$/;

const ISO_TIMESTAMP_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

export interface ValidatedCursor {
  v: 1;
  createdAt: string;
  id: string;
}

function cursorError(
  message: string,
  reason: string,
): never {
  throw new BadRequestException({
    message,
    details: [
      {
        field: 'cursor',
        reason,
      },
    ],
  });
}

export function validateCursor(
  cursor: string,
): ValidatedCursor {
  // Reject oversized cursors.
  if (cursor.length > MAX_CURSOR_LENGTH) {
    cursorError(
      'cursor is too long',
      'too_long',
    );
  }

  // Cursor must use base64url characters.
  if (
    cursor.length === 0 ||
    !BASE64URL_REGEX.test(cursor)
  ) {
    cursorError(
      'cursor is invalid',
      'invalid_encoding',
    );
  }

  let decoded: string;

  try {
    decoded = Buffer.from(
      cursor,
      'base64url',
    ).toString('utf8');
  } catch {
    cursorError(
      'cursor is invalid',
      'invalid_encoding',
    );
  }

  let payload: unknown;

  try {
    payload = JSON.parse(decoded);
  } catch {
    cursorError(
      'cursor is invalid',
      'invalid_json',
    );
  }

  if (
    typeof payload !== 'object' ||
    payload === null
  ) {
    cursorError(
      'cursor is invalid',
      'invalid_payload',
    );
  }

  const value =
    payload as Record<string, unknown>;

  // Cursor version.
  if (value.v !== 1) {
    cursorError(
      'cursor version is invalid',
      'invalid_version',
    );
  }

  // Cursor timestamp.
  if (
    typeof value.createdAt !== 'string' ||
    !ISO_TIMESTAMP_REGEX.test(value.createdAt) ||
    Number.isNaN(
      Date.parse(value.createdAt),
    )
  ) {
    cursorError(
      'cursor timestamp is invalid',
      'invalid_timestamp',
    );
  }

  // Cursor ID.
  if (
    typeof value.id !== 'string' ||
    !UUID_REGEX.test(value.id)
  ) {
    cursorError(
      'cursor id is invalid',
      'invalid_uuid',
    );
  }

  return {
    v: 1,
    createdAt: value.createdAt,
    id: value.id,
  };
}