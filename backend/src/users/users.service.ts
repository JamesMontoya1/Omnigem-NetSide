import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        createdAt: true,
        workerId: true,
        worker: { select: { id: true, name: true } },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        roles: true,
        createdAt: true,
        workerId: true,
        worker: { select: { id: true, name: true } },
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async create(
    email: string,
    password: string,
    roles: string[],
    name?: string,
    workerId: number | null = null,
  ) {
    const hashed = await bcrypt.hash(password, 10);
    const data: any = { email, password: hashed, roles: roles as any, name };
    if (workerId !== null) data.workerId = workerId;
    try {
      return await this.prisma.user.create({
        data,
        select: { id: true, email: true, name: true, roles: true, createdAt: true, workerId: true, worker: { select: { id: true, name: true } } },
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

  async update(id: number, data: { email?: string; password?: string; roles?: string[]; name?: string; workerId?: number | null }) {
    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.roles !== undefined) updateData.roles = data.roles;
    if (data.password) updateData.password = await bcrypt.hash(data.password, 10);
    if (data.workerId !== undefined) updateData.workerId = data.workerId;
    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateData,
        select: { id: true, email: true, name: true, roles: true, createdAt: true, workerId: true, worker: { select: { id: true, name: true } } },
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
    return this.prisma.user.upsert({
      where: { email },
      update: { password: hashed, roles: ['ADMIN'], name },
      create: { email, password: hashed, roles: ['ADMIN'], name },
    });
  }
}
