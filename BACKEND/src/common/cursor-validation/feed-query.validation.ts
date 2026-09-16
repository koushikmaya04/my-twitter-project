import { BadRequestException } from '@nestjs/common';
import { validateCursor } from './cursor.validation';

const ALLOWED_QUERY_PARAMS = new Set([
  'cursor',
  'limit',
]);

function validationError(
  message: string,
  field: string,
  reason: string,
): never {
  throw new BadRequestException({
    message,
    details: [
      {
        field,
        reason,
      },
    ],
  });
}

export function validateFeedQuery(
  query: Record<string, unknown>,
): {
  cursor: string | null;
  limit: number;
} {
  // Reject unknown query parameters, including legacy ?page=1
  for (const key of Object.keys(query)) {
    if (!ALLOWED_QUERY_PARAMS.has(key)) {
      validationError(
        `Unknown query parameter: ${key}`,
        key,
        'unknown_field',
      );
    }
  }

  const cursorValue = query.cursor;

  if (Array.isArray(cursorValue)) {
    validationError(
      'cursor must be provided only once',
      'cursor',
      'duplicate',
    );
  }

  const limitValue = query.limit;

  if (Array.isArray(limitValue)) {
    validationError(
      'limit must be provided only once',
      'limit',
      'duplicate',
    );
  }

  let limit = 10;

  if (limitValue !== undefined) {
    if (typeof limitValue !== 'string') {
      validationError(
        'limit must be an integer from 1 to 50',
        'limit',
        'invalid_type',
      );
    }

    if (!/^\d+$/.test(limitValue)) {
      validationError(
        'limit must be an integer from 1 to 50',
        'limit',
        'invalid_format',
      );
    }

    limit = Number(limitValue);

    if (limit < 1 || limit > 50) {
      validationError(
        'limit must be an integer from 1 to 50',
        'limit',
        'out_of_range',
      );
    }
  }

  let cursor: string | null = null;

  if (cursorValue !== undefined) {
    if (typeof cursorValue !== 'string') {
      validationError(
        'cursor must be a string',
        'cursor',
        'invalid_type',
      );
    }

    if (cursorValue.length === 0) {
      validationError(
        'cursor must not be empty',
        'cursor',
        'empty',
      );
    }

    try {
      validateCursor(cursorValue);
    } catch {
      validationError(
        'cursor is invalid',
        'cursor',
        'invalid',
      );
    }

    cursor = cursorValue;
  }

  return {
    cursor,
    limit,
  };
}