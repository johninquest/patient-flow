import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { defineAbilitiesFor } from '../ability';

/**
 * CASL Guard — attaches the user's ability object to the request.
 * Must be used AFTER AuthGuard (which sets request.user).
 * 
 * Usage:
 *   @UseGuards(AuthGuard, CaslGuard)
 * 
 * After this guard runs, `request.ability` is available for use
 * in controllers and services.
 */
@Injectable()
export class CaslGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return false;
    }

    request.ability = defineAbilitiesFor({
      id: user.id,
      role: user.role,
    });

    return true;
  }
}
