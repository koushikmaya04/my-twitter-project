import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { Inject } from '@nestjs/common';
import { DATABASE } from '../database/database.provider';

@Injectable()
export class HealthService {
  constructor(
    @Inject(DATABASE)
    private readonly db: any,
  ) {}

  getLive() {
    return {
      status: 'ok',
    };
  }

  async getReady() {
    try {
      await this.db.execute(sql`SELECT 1`);

      return {
        status: 'ok',
        database: 'ok',
      };
   } catch (error) {
  console.error('Database readiness check failed:', error);

  throw new ServiceUnavailableException({
        status: 'error',
        database: 'unavailable',
      });
    }
  }
}