import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permission.findMany({ orderBy: { id: 'asc' } });
  }

  async create(key: string, label: string, description?: string) {
    return this.prisma.permission.create({
      data: { key, label, description },
    });
  }

  async update(id: number, data: { key?: string; label?: string; description?: string }) {
    return this.prisma.permission.update({ where: { id }, data });
  }

  async remove(id: number) {
    return this.prisma.permission.delete({ where: { id } });
  }
}
