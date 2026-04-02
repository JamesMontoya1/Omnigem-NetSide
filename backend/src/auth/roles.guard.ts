import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Acesso negado');
    }

    // Admin always bypasses
    if (user.isAdmin) return true;

    // Permission-based check
    if (user.permissions && Array.isArray(user.permissions)) {
      const has = requiredRoles.some((r: string) => user.permissions.includes(r));
      if (has) return true;
    }

    throw new ForbiddenException('Acesso negado: permissão insuficiente');
  }
}
