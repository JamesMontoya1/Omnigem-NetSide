import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  createdAt: true,
  workerId: true,
  worker: { select: { id: true, name: true } },
  permissionGroupId: true,
  permissionGroup: {
    select: {
      id: true,
      name: true,
      isAdmin: true,
      permissions: { select: { id: true, key: true, label: true } },
    },
  },
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: USER_SELECT,
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(
    email: string,
    password: string,
    name?: string,
    workerId: number | null = null,
    permissionGroupId: number | null = null,
  ) {
    const hashed = await bcrypt.hash(password, 10);
    const data: any = { email, password: hashed, name };
    if (workerId !== null) data.workerId = workerId;
    if (permissionGroupId !== null) data.permissionGroupId = permissionGroupId;
    try {
      return await this.prisma.user.create({
        data,
        select: USER_SELECT,
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = (e as any).meta?.target;
        if (Array.isArray(target) && target.includes('workerId')) {
          throw new BadRequestException('Trabalhador já atribuído a outro usuário');
        }
      }
      throw e;
    }
  }

  async update(id: number, data: { email?: string; password?: string; name?: string; workerId?: number | null; permissionGroupId?: number | null }) {
    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.workerId !== undefined) updateData.workerId = data.workerId;
    if (data.permissionGroupId !== undefined) updateData.permissionGroupId = data.permissionGroupId;
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: USER_SELECT,
      });
    } catch (e: any) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        const target = (e as any).meta?.target;
        if (Array.isArray(target) && target.includes('workerId')) {
          throw new BadRequestException('Trabalhador já atribuído a outro usuário');
        }
      }
      throw e;
    }
  }

  async remove(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async createAdmin(email: string, password: string, name?: string) {
    const hashed = await bcrypt.hash(password, 10);
    const adminGroup = await this.prisma.permissionGroup.findFirst({ where: { isAdmin: true } });
    return this.prisma.user.upsert({
      where: { email },
      update: { password: hashed, name, permissionGroupId: adminGroup?.id ?? null },
      create: { email, password: hashed, name, permissionGroupId: adminGroup?.id ?? null },
    });
  }
}
