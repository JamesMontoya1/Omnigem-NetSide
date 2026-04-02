import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('users.view')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }

  @Post()
  @Roles('users.edit')
  create(
    @Body()
    body: { email: string; password: string; name?: string; workerId?: number | null; permissionGroupId?: number | null },
  ) {
    return this.usersService.create(body.email, body.password, body.name, body.workerId ?? null, body.permissionGroupId ?? null);
  }

  @Put(':id')
  @Roles('users.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { email?: string; password?: string; name?: string; workerId?: number | null; permissionGroupId?: number | null },
  ) {
    return this.usersService.update(id, body);
  }

  @Delete(':id')
  @Roles('users.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
