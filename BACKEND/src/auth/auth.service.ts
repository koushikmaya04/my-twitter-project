import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
  NotFoundException,
   BadRequestException,
} from '@nestjs/common';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import * as argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import { sessions, users } from '../database/schema';

@Injectable()
export class AuthService {
  constructor(@Inject(DATABASE) private readonly db: any) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private readSessionToken(cookieHeader?: string): string | undefined {
    const cookie = cookieHeader
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('session='));

    return cookie?.slice('session='.length) || undefined;
  }

private validateObjectInput(
  input: unknown,
  allowedFields: string[],
): Record<string, unknown> {
  if (
    !input ||
    typeof input !== 'object' ||
    Array.isArray(input)
  ) {
    throw new BadRequestException(
      'Request body must be a JSON object',
    );
  }

  const body = input as Record<string, unknown>;

  if (Object.keys(body).some(
    (key) => !allowedFields.includes(key),
  )) {
    throw new BadRequestException(
      'Request body contains unsupported fields',
    );
  }

  return body;
}

private normalizeAndValidateHandle(
  value: unknown,
): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Handle must be a string',
    );
  }

  const handle = value.trim().toLowerCase();

  if (handle.length < 3 || handle.length > 30) {
    throw new BadRequestException(
      'Handle must contain between 3 and 30 characters',
    );
  }

  if (!/^[a-z0-9_]+$/.test(handle)) {
    throw new BadRequestException(
      'Handle may contain only letters, numbers, and underscores',
    );
  }

  return handle;
}

private validatePassword(value: unknown): string {
  if (typeof value !== 'string') {
    throw new BadRequestException(
      'Password must be a string',
    );
  }

  const length = Array.from(value).length;

  if (length < 8 || length > 128) {
    throw new BadRequestException(
      'Password must contain between 8 and 128 characters',
    );
  }

  return value;
}

  async register(input: {
    handle: string;
    displayName: string;
    password: string;
  }) {
   
const body = this.validateObjectInput(input, [
  'handle',
  'displayName',
  'password',
]);

const handle = this.normalizeAndValidateHandle(
  body.handle,
);

if (typeof body.displayName !== 'string') {
  throw new BadRequestException(
    'Display name must be a string',
  );
}

const displayName = body.displayName.trim();
const displayNameLength = Array.from(displayName).length;

if (displayNameLength < 1 || displayNameLength > 80) {
  throw new BadRequestException(
    'Display name must contain between 1 and 80 characters',
  );
}

const password = this.validatePassword(body.password);
const passwordHash = await argon2.hash(password);


    try {
      const [user] = await this.db
        .insert(users)
        .values({
          id: randomUUID(),
          handle,
          displayName,
          passwordHash,
        })
        .returning({
          id: users.id,
          handle: users.handle,
          displayName: users.displayName,
          createdAt: users.createdAt,
        });

      return { item: user };
    } catch (error) {
      // DrizzleQueryError wraps the underlying PostgreSQL error in cause.
      const dbError = error as {
        code?: string;
        cause?: { code?: string };
      };

      if (dbError.code === '23505' || dbError.cause?.code === '23505') {
        throw new ConflictException('Handle is already taken');
      }

      throw error;
    }
  }

  async login(input: { handle: string; password: string }) {
   const body = this.validateObjectInput(input, [
  'handle',
  'password',
]);

const handle = this.normalizeAndValidateHandle(
  body.handle,
);

const password = this.validatePassword(body.password);

   const [user] = await this.db
  .select({
    id: users.id,
    handle: users.handle,
    displayName: users.displayName,
    createdAt: users.createdAt,
    passwordHash: users.passwordHash,
    deactivatedAt: users.deactivatedAt,
  })
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1);
if (
  !user?.passwordHash ||
  !(await argon2.verify(user.passwordHash, password)) ||
  user.deactivatedAt !== null
) {
  throw new UnauthorizedException('Invalid handle or password');
}

    // Send the raw token only to the browser; store its hash in PostgreSQL.
    const token = randomBytes(32).toString('base64url');
    const tokenHash = this.hashToken(token);
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    );

    await this.db.insert(sessions).values({
      tokenHash,
      userId: user.id,
      expiresAt,
    });

    return {
      token,
      item: {
        id: user.id,
        handle: user.handle,
        displayName: user.displayName,
        createdAt: user.createdAt,
      },
    };
  }

  async me(cookieHeader?: string) {
    const token = this.readSessionToken(cookieHeader);

    if (!token) {
      throw new UnauthorizedException('Authentication required');
    }

    const [result] = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        createdAt: users.createdAt,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date()),
           isNull(users.deactivatedAt),
        ),
      )
      .limit(1);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return result;
  }

async deactivate(userId: string): Promise<void> {
  const now = new Date();

  await this.db.transaction(async (tx: any) => {
    const [user] = await tx
      .update(users)
      .set({
        deactivatedAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, userId),
          isNull(users.deactivatedAt),
        ),
      )
      .returning({ id: users.id });

    if (!user) {
      throw new NotFoundException('Active account not found');
    }

    await tx
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
        ),
      );
  });
}

  async logout(cookieHeader?: string) {
    const token = this.readSessionToken(cookieHeader);

    if (!token) {
      return;
    }

    await this.db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.tokenHash, this.hashToken(token)),
          isNull(sessions.revokedAt),
        ),
      );
  }
}