import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UsersService } from '../users/users.service';

class LoginDto {
  email: string;
  password: string;
}

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService, private usersService: UsersService) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { email, password } = body;
    return this.authService.login(email, password);
  }

  /** Returns the current user info decoded from the JWT */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: any) {
    const base = { id: req.user.sub, email: req.user.email, roles: req.user.roles } as any;
    try {
      const user = await this.usersService.findById(req.user.sub);
      if (user) {
        base.name = (user as any).name ?? undefined;
        base.workerId = (user as any).workerId ?? undefined;
      }
    } catch (e) {
      // ignore
    }
    return base;
  }
}
