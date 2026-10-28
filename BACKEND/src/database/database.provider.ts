import {
  OnApplicationShutdown,
  Provider,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

export const DATABASE = Symbol('DATABASE');

class DatabaseProvider implements OnApplicationShutdown {
  private readonly pool: Pool;

  readonly db;

  constructor(configService: ConfigService) {
    const connectionString =
      configService.getOrThrow<string>('DATABASE_URL');

    this.pool = new Pool({
      connectionString,
      connectionTimeoutMillis:
        configService.get<number>(
          'DATABASE_CONNECT_TIMEOUT_MS',
        ) ?? 5000,
    });

    this.db = drizzle({ client: this.pool });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}

export const databaseProvider: Provider = {
  provide: DATABASE,
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const database = new DatabaseProvider(configService);

    return database.db;
  },
};