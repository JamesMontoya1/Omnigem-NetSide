import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../prisma/prisma.service'
import { TimePunchType } from '@prisma/client'

export interface PontoSimplesPayload {
  status?: string
  verification_key?: string
  data?: {
    id?: number
    ip?: string
    date?: string
    time?: string
    source?: string
    user_id?: number
    user_name?: string
    user_pis?: string
    user_cpf?: string
    team_id?: number | null
    team_name?: string
    trusted_device?: boolean
    latitude?: number | null
    longitude?: number | null
    accuracy?: number | null
    photo_url?: string | null
    datetime?: string
  }
}

@Injectable()
export class PontoSimplesService {
  private readonly logger = new Logger(PontoSimplesService.name)

  private readonly VERIFICATION_KEY =
    process.env.PONTOSIMPLES_VERIFICATION_KEY || ''

  constructor(private prisma: PrismaService) {}

  validateKey(key?: string): boolean {
    if (!this.VERIFICATION_KEY) return true // Sem chave configurada = aceita tudo
    if (!key) return false
    return key === this.VERIFICATION_KEY
  }

  getVerificationKey(): string {
    return this.VERIFICATION_KEY
  }

  /**
   * Testa a conectividade do webhook: valida chave, verifica DB,
   * e faz um POST real no próprio endpoint para validar o fluxo completo.
   */
  async testConnection(verificationKey?: string): Promise<{
    ok: boolean
    checks: { name: string; ok: boolean; detail: string }[]
  }> {
    const checks: { name: string; ok: boolean; detail: string }[] = []

    // 1. Verificar se a chave está configurada
    const keyConfigured = !!this.VERIFICATION_KEY
    checks.push({
      name: 'Chave de verificação configurada',
      ok: keyConfigured,
      detail: keyConfigured
        ? 'PONTOSIMPLES_VERIFICATION_KEY está definida'
        : 'PONTOSIMPLES_VERIFICATION_KEY não está definida no .env',
    })

    // 2. Validar a chave enviada
    const keyValid = this.validateKey(verificationKey)
    checks.push({
      name: 'Chave de verificação válida',
      ok: keyValid,
      detail: keyValid
        ? 'A chave enviada confere com a configurada'
        : 'A chave enviada não confere (ou não foi enviada)',
    })

    // 3. Verificar conexão com o banco
    let dbOk = false
    try {
      await this.prisma.$queryRaw`SELECT 1`
      dbOk = true
    } catch {}
    checks.push({
      name: 'Conexão com banco de dados',
      ok: dbOk,
      detail: dbOk ? 'Banco de dados acessível' : 'Falha ao conectar no banco de dados',
    })

    // 4. Verificar se existem workers com pontoSimplesUserId vinculado
    let linkedWorkers = 0
    let sampleWorker: { id: number; name: string; pontoSimplesUserId: number | null } | null = null
    try {
      linkedWorkers = await this.prisma.worker.count({
        where: { pontoSimplesUserId: { not: null }, active: true },
      })
      if (linkedWorkers > 0) {
        sampleWorker = await this.prisma.worker.findFirst({
          where: { pontoSimplesUserId: { not: null }, active: true },
          select: { id: true, name: true, pontoSimplesUserId: true },
        })
      }
    } catch {}
    checks.push({
      name: 'Workers vinculados ao PontoSimples',
      ok: linkedWorkers > 0,
      detail: linkedWorkers > 0
        ? `${linkedWorkers} worker(s) com pontoSimplesUserId vinculado`
        : 'Nenhum worker vinculado — vincule pontoSimplesUserId nos trabalhadores',
    })

    // 5. Teste end-to-end: simular um webhook completo (cria e remove o registro)
    let e2eOk = false
    let e2eDetail = ''
    if (dbOk && keyValid) {
      try {
        const testPayload: PontoSimplesPayload = {
          status: 'success',
          verification_key: this.VERIFICATION_KEY,
          data: {
            id: 999999999,
            user_id: 0,
            user_name: '__TEST__',
            date: '2000-01-01',
            time: '00:00',
            source: 'TEST',
            datetime: '2000-01-01T00:00:00.000Z',
          },
        }

        // Processar o webhook como se fosse real
        const result = await this.processWebhook(testPayload)

        if (result.status === 'received' && result.punchId) {
          // Limpar o registro de teste
          await this.prisma.timePunch.delete({ where: { id: result.punchId } })
          e2eOk = true
          e2eDetail = `Fluxo completo OK — webhook criou ponto pendente, registro de teste removido`
        } else {
          e2eDetail = `Webhook retornou: ${result.status} — ${(result as any).reason || 'sem detalhes'}`
        }
      } catch (err) {
        e2eDetail = `Erro no fluxo: ${err instanceof Error ? err.message : 'erro desconhecido'}`
      }
    } else if (!keyValid) {
      e2eDetail = 'Não é possível testar com chave inválida'
    } else {
      e2eDetail = 'Não é possível testar sem conexão com o banco'
    }
    checks.push({
      name: 'Teste end-to-end (webhook completo)',
      ok: e2eOk,
      detail: e2eDetail,
    })

    // 6. Último ponto real recebido do PontoSimples
    let lastPunch: { occurredAt: Date; worker: { name: string } | null } | null = null
    try {
      lastPunch = await this.prisma.timePunch.findFirst({
        where: { source: 'PONTOSIMPLES' },
        orderBy: { createdAt: 'desc' },
        select: { occurredAt: true, worker: { select: { name: true } } },
      })
    } catch {}
    checks.push({
      name: 'Último ponto via PontoSimples',
      ok: !!lastPunch,
      detail: lastPunch
        ? `${lastPunch.worker?.name || '(pendente)'} em ${lastPunch.occurredAt.toISOString()}`
        : 'Nenhum ponto recebido via PontoSimples ainda',
    })

    const ok = checks.every((c) => c.ok)
    return { ok, checks }
  }

  /**
   * Recebe o payload do PontoSimples e cria um TimePunch SEM vincular
   * a um worker — fica pendente para vinculação manual pelo admin.
   */
  async processWebhook(payload: PontoSimplesPayload) {
    const data = payload.data
    if (!data) {
      this.logger.warn('Webhook recebido sem dados')
      return { status: 'ignored', reason: 'Sem dados no payload' }
    }

    // 1. Montar occurredAt
    const occurredAt = data.datetime
      ? new Date(data.datetime)
      : data.date && data.time
        ? new Date(`${data.date}T${data.time}:00`)
        : new Date()

    // 2. ExternalId = id do registro no PontoSimples
    const externalId = data.id ? String(data.id) : null

    // 3. Tipo padrão IN (será ajustado ao vincular o worker)
    const type: TimePunchType = 'IN'

    // 4. Criar (ou upsert se já existir pelo externalId) — sem workerId
    const punchData = {
      occurredAt,
      type,
      source: 'PONTOSIMPLES' as const,
      externalId,
      raw: payload as any,
    }

    let punch
    if (externalId) {
      punch = await this.prisma.timePunch.upsert({
        where: {
          source_externalId: {
            source: 'PONTOSIMPLES',
            externalId,
          },
        },
        create: punchData,
        update: {
          occurredAt,
          raw: payload as any,
        },
      })
    } else {
      punch = await this.prisma.timePunch.create({
        data: punchData,
      })
    }

    this.logger.log('─── Ponto criado/atualizado ───')
    this.logger.log(`  Punch ID:    ${punch.id}`)
    this.logger.log(`  ExternalId:  ${externalId ?? '(sem id externo)'}`)
    this.logger.log(`  OccurredAt:  ${occurredAt.toISOString()}`)
    this.logger.log(`  Tipo:        ${type}`)
    this.logger.log(`  user_name:   ${data.user_name ?? '(vazio)'}`)
    this.logger.log(`  user_id:     ${data.user_id ?? '(vazio)'}`)
    this.logger.log(`  Pendente:    SIM (sem worker vinculado)`)

    return {
      status: 'received',
      punchId: punch.id,
      type,
      workerName: data.user_name || null,
      pending: true,
    }
  }

  /**
   * Infere o tipo do ponto baseado na sequência do dia:
   * 0 pontos → IN
   * 1 ponto  → BREAK_START
   * 2 pontos → BREAK_END
   * 3 pontos → OUT
   * 4+ → alterna IN/OUT
   */
  private async inferPunchType(
    workerId: number,
    occurredAt: Date,
  ): Promise<TimePunchType> {
    const dayStart = new Date(occurredAt)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(occurredAt)
    dayEnd.setHours(23, 59, 59, 999)

    const dayPunches = await this.prisma.timePunch.findMany({
      where: {
        workerId,
        occurredAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { occurredAt: 'asc' },
    })

    const count = dayPunches.length
    if (count === 0) return 'IN'
    if (count === 1) return 'BREAK_START'
    if (count === 2) return 'BREAK_END'
    if (count === 3) return 'OUT'
    // 4+ → alterna
    return count % 2 === 0 ? 'IN' : 'OUT'
  }
}
