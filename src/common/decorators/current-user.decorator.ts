import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AdminUser } from '../../auth/entities/admin-user.entity.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AdminUser => {
    const request = ctx.switchToHttp().getRequest<{ user: AdminUser }>();
    return request.user;
  },
);
