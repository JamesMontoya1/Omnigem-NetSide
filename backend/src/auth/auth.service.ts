import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'devsecret';

@Injectable()
export class AuthService {
  constructor(private usersService: UsersService) {}

  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.password) return null;
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return null;
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const full = await this.usersService.findById(user.id);
    const group = (full as any)?.permissionGroup;
    const isAdmin = group?.isAdmin ?? false;
    const permissions = (group?.permissions ?? []).map((p: any) => p.key);

    const payload = { sub: user.id, email: user.email, isAdmin, permissions };
    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
    return {
      accessToken: token,
      isAdmin,
      permissions,
      permissionGroup: group?.name ?? null,
    };
  }
}
