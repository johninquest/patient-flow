import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { getAuth } from '../auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const auth = getAuth();
    if (!auth) return false;
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session?.user) {
      return false;
    }

    // Check if user account is active
    if (session.user.status === 'suspended') {
      throw new ForbiddenException(
        'Your account has been suspended. Please contact your administrator.',
      );
    }

    request.user = session.user;
    return true;
  }
}
