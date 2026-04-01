import { BadRequestException, Inject, Injectable, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, TimePunchSource, TimePunchType } from '@prisma/client';
import { TimePunchProvider } from './time-punch.provider';

type ImportPunchInput = {
  workerId: number;
  occurredAt: string;
  type: TimePunchType;
  externalId?: string | null;
  raw?: Prisma.InputJsonValue | null;
};

@Injectable()
export class TimePunchesService {
  constructor(
    private prisma: PrismaService,
    @Optional() @Inject('TIME_PUNCH_PROVIDER') private provider?: TimePunchProvider,
  ) {}

  list(params: { workerId?: number; from?: string; to?: string }) {
    const where: Prisma.TimePunchWhereInput = {};

    if (params.workerId !== undefined) where.workerId = params.workerId;
    if (params.from || params.to) {
      where.occurredAt = {
        ...(params.from ? { gte: new Date(params.from) } : {}),
        ...(params.to ? { lte: new Date(params.to) } : {}),
      };
    }

    return this.prisma.timePunch.findMany({
      where,
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      include: { worker: true },
    });
  }

  create(data: { workerId: number; occurredAt: string; type: TimePunchType }) {
    return this.prisma.timePunch.create({
      data: {
        worker: { connect: { id: data.workerId } },
        occurredAt: new Date(data.occurredAt),
        type: data.type,
        source: 'MANUAL',
      },
      include: { worker: true },
    });
  }

  update(id: number, data: { occurredAt?: string; type?: TimePunchType }) {
    return this.prisma.timePunch.update({
      where: { id },
      data: {
        ...(data.occurredAt ? { occurredAt: new Date(data.occurredAt) } : {}),
        ...(data.type ? { type: data.type } : {}),
      },
      include: { worker: true },
    });
  }

  remove(id: number) {
    return this.prisma.timePunch.delete({ where: { id } });
  }

  async importMany(params: { source: TimePunchSource; punches: ImportPunchInput[] }) {
    if (!params.punches?.length) {
      throw new BadRequestException('Nenhuma batida enviada');
    }

    return this.prisma.$transaction(async (tx) => {
      const results: Array<{ id: number; workerId: number; occurredAt: Date; type: TimePunchType; source: TimePunchSource; externalId: string | null }> = [];

      for (const p of params.punches) {
        if (!p.workerId || !p.occurredAt || !p.type) {
          throw new BadRequestException('Campos obrigatórios: workerId, occurredAt, type');
        }

        const data: Prisma.TimePunchCreateInput = {
          worker: { connect: { id: p.workerId } },
          occurredAt: new Date(p.occurredAt),
          type: p.type,
          source: params.source,
          externalId: p.externalId ?? undefined,
          raw: (p.raw ?? undefined) as any,
        };

        if (p.externalId) {
          const row = await tx.timePunch.upsert({
            where: { source_externalId: { source: params.source, externalId: p.externalId } },
            create: data,
            update: {
              occurredAt: data.occurredAt,
              type: data.type,
              worker: data.worker,
              raw: data.raw,
            },
            select: { id: true, workerId: true, occurredAt: true, type: true, source: true, externalId: true },
          });
          results.push(row);
        } else {
          const row = await tx.timePunch.create({
            data,
            select: { id: true, workerId: true, occurredAt: true, type: true, source: true, externalId: true },
          });
          results.push(row);
        }
      }

      return { imported: results.length, rows: results };
    });
  }

  /**
   * Sincroniza batidas do provider externo (ex.: PontoSimples).
   * Quando o provider local está ativo, não faz nada.
   */
  async syncFromProvider(params: { workerId?: number; from?: string; to?: string }) {
    if (!this.provider || this.provider.name === 'LOCAL') {
      return { synced: 0, message: 'Nenhum provider externo configurado' };
    }

    const externalPunches = await this.provider.fetchPunches(params);
    if (!externalPunches.length) return { synced: 0 };

    const source: TimePunchSource = 'PONTOSIMPLES';
    const result = await this.importMany({
      source,
      punches: externalPunches,
    });

    return { synced: result.imported, rows: result.rows };
  }
}

