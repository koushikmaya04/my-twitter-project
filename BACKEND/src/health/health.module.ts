import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { paramController } from '../comments/comments.controller';



@Module({
  controllers: [HealthController, paramController ],

  providers: [HealthService],
})
export class HealthModule {}