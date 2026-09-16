import { BadRequestException } from '@nestjs/common';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateUuid(id: string): string {
  if (!UUID_REGEX.test(id)) {
    throw new BadRequestException({
      message: 'id must be a valid UUID',
    });
  }

  return id;
}