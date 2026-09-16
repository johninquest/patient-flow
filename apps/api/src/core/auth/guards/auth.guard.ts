import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { getAuth } from '../auth.js';
import { PENDING_ROLE } from '../roles.js';

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

    // Self-registered users hold `pending` until an admin grants a role. They
    // are authenticated, so this is enforced here rather than as a 401.
    //
    // This check lives in the guard, not in individual controllers, because
    // several endpoints are protected by AuthGuard alone (the dashboard, and
    // GET /users/assignable). Gating per-controller would leave those readable
    // by anyone who can sign up. `AuthGuard` is applied to every protected
    // route, so this is the only place that cannot be forgotten.
    if (session.user.role === PENDING_ROLE) {
      throw new ForbiddenException(
        'Your account is pending access. An administrator must assign you a role.',
      );
    }

    request.user = session.user;
    return true;
  }
}
