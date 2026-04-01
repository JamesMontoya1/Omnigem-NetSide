import { Injectable, Logger } from '@nestjs/common';
import { TimePunchType } from '@prisma/client';

/**
 * Contrato para provedores de ponto eletrônico.
 * Quando a API do PontoSimples estiver disponível,
 * basta implementar esta interface em PontoSimplesProvider.
 */
export interface TimePunchProvider {
  readonly name: string;

  /** Busca batidas no período para um trabalhador (ou todos). */
  fetchPunches(params: {
    workerId?: number;
    from?: string;
    to?: string;
  }): Promise<ExternalPunch[]>;

  /** Registra uma batida no sistema externo (se aplicável). */
  registerPunch?(params: {
    workerId: number;
    occurredAt: string;
    type: TimePunchType;
  }): Promise<{ externalId: string }>;
}

export type ExternalPunch = {
  externalId: string;
  workerId: number;
  occurredAt: string;
  type: TimePunchType;
  raw?: any;
};

/**
 * Implementação local — lê/grava diretamente no banco via service.
 * Não faz chamadas externas. Serve como fallback enquanto
 * a integração PontoSimples não está ativa.
 */
@Injectable()
export class LocalTimePunchProvider implements TimePunchProvider {
  readonly name = 'LOCAL';
  private readonly logger = new Logger(LocalTimePunchProvider.name);

  async fetchPunches(): Promise<ExternalPunch[]> {
    // Sem integração externa — os dados já estão no banco local.
    this.logger.debug('LocalProvider: sem sync externo');
    return [];
  }
}

/**
 * Stub para PontoSimples — descomentar e implementar quando
 * tivermos acesso à API.
 *
 * @example
 * ```ts
 * @Injectable()
 * export class PontoSimplesProvider implements TimePunchProvider {
 *   readonly name = 'PONTOSIMPLES';
 *
 *   constructor(private http: HttpService) {} // @nestjs/axios
 *
 *   async fetchPunches(params) {
 *     const { data } = await this.http.axiosRef.get(
 *       `${PONTO_SIMPLES_BASE}/punches`,
 *       { params, headers: { Authorization: `Bearer ${PONTO_SIMPLES_TOKEN}` } },
 *     );
 *     return data.map(mapToExternalPunch);
 *   }
 *
 *   async registerPunch(params) {
 *     const { data } = await this.http.axiosRef.post(
 *       `${PONTO_SIMPLES_BASE}/punches`,
 *       params,
 *       { headers: { Authorization: `Bearer ${PONTO_SIMPLES_TOKEN}` } },
 *     );
 *     return { externalId: data.id };
 *   }
 * }
 * ```
 */
