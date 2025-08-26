import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { DecodedIdToken } from 'firebase-admin/auth';

export const UserUUID = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest();

    const user = request.user as DecodedIdToken | undefined;

    return user?.uid ?? null;
  },
);

export default UserUUID;
