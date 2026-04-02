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
import { PermissionGroupsService } from './permission-groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('permission-groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('users.view')
export class PermissionGroupsController {
  constructor(private service: PermissionGroupsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findById(id);
  }

  @Post()
  @Roles('users.edit')
  create(@Body() body: { name: string; description?: string; isAdmin?: boolean; permissionIds?: number[] }) {
    return this.service.create(body);
  }

  @Put(':id')
  @Roles('users.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { name?: string; description?: string; isAdmin?: boolean; permissionIds?: number[] },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles('users.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
