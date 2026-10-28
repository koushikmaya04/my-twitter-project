import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { DataModule } from '../data/data.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DataModule, AuthModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
