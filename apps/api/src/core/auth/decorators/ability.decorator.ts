import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AppAbility } from '../ability';

/**
 * Decorator to access the CASL ability object from the request.
 * Must be used with CaslGuard.
 * 
 * Usage:
 *   @UseGuards(AuthGuard, CaslGuard)
 *   findAll(@Ability() ability: AppAbility) {
 *     if (!ability.can('read', 'Patient')) { ... }
 *   }
 */
export const Ability = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): AppAbility => {
    const request = ctx.switchToHttp().getRequest();
    return request.ability;
  },
);
