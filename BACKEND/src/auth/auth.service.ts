import {
  ConflictException,
  Inject,
  Injectable,
  UnauthorizedException,
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

  async register(input: {
    handle: string;
    displayName: string;
    password: string;
  }) {
    const handle = input.handle?.trim().toLowerCase();
    const displayName = input.displayName?.trim();

    if (!handle || !displayName || !input.password) {
      throw new ConflictException(
        'Handle, display name, and password are required',
      );
    }

    if (input.password.length < 8) {
      throw new ConflictException(
        'Password must contain at least 8 characters',
      );
    }

    const passwordHash = await argon2.hash(input.password);

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
    const handle = input.handle?.trim().toLowerCase();

    if (!handle || !input.password) {
      throw new UnauthorizedException('Invalid handle or password');
    }

    const [user] = await this.db
      .select({
        id: users.id,
        handle: users.handle,
        displayName: users.displayName,
        createdAt: users.createdAt,
        passwordHash: users.passwordHash,
      })
      .from(users)
      .where(eq(users.handle, handle))
      .limit(1);

    if (
      !user?.passwordHash ||
      !(await argon2.verify(user.passwordHash, input.password))
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
        ),
      )
      .limit(1);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    return result;
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