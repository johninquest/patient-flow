import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { getAuth } from '../auth';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    const auth = getAuth();
    const session = await auth.api.getSession({ headers: request.headers });
    
    
    if (!session?.user) {
      return false;
    }
    
    request.user = session.user;
    return true;
  }
}