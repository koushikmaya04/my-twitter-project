
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import type { AuthenticatedRequest } from './authenticated-request';
import { AuthService } from './auth.service';

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = await this.authService.me(request.headers.cookie);

    request.user = user;

    return true;
  }
}
