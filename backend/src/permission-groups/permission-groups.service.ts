import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PermissionGroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.permissionGroup.findMany({
      include: {
        permissions: { select: { id: true, key: true, label: true } },
        _count: { select: { users: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.permissionGroup.findUnique({
      where: { id },
      include: {
        permissions: { select: { id: true, key: true, label: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async create(data: { name: string; description?: string; isAdmin?: boolean; permissionIds?: number[] }) {
    return this.prisma.permissionGroup.create({
      data: {
        name: data.name,
        description: data.description,
        isAdmin: data.isAdmin ?? false,
        permissions: data.permissionIds?.length
          ? { connect: data.permissionIds.map((id) => ({ id })) }
          : undefined,
      },
      include: {
        permissions: { select: { id: true, key: true, label: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async update(id: number, data: { name?: string; description?: string; isAdmin?: boolean; permissionIds?: number[] }) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isAdmin !== undefined) updateData.isAdmin = data.isAdmin;
    if (data.permissionIds !== undefined) {
      updateData.permissions = {
        set: data.permissionIds.map((pid) => ({ id: pid })),
      };
    }
    return this.prisma.permissionGroup.update({
      where: { id },
      data: updateData,
      include: {
        permissions: { select: { id: true, key: true, label: true } },
        _count: { select: { users: true } },
      },
    });
  }

  async remove(id: number) {
    return this.prisma.permissionGroup.delete({ where: { id } });
  }
}
