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
import { PermissionsService } from './permissions.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('permissions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('users.view')
export class PermissionsController {
  constructor(private service: PermissionsService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('users.edit')
  create(@Body() body: { key: string; label: string; description?: string }) {
    return this.service.create(body.key, body.label, body.description);
  }

  @Put(':id')
  @Roles('users.edit')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { key?: string; label?: string; description?: string },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  @Roles('users.edit')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
