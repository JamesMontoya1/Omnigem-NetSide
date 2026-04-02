import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  Logger,
} from '@nestjs/common'
import { PontoSimplesService, PontoSimplesPayload } from './pontosimples.service'

@Controller('pontosimples')
export class PontoSimplesController {
  private readonly logger = new Logger(PontoSimplesController.name)

  constructor(private readonly service: PontoSimplesService) {}

  /**
   * GET /pontosimples/webhook
   * Responde ao health-check / verificação do PontoSimples (ngrok, etc.).
   */
  @Get('webhook')
  webhookHealthCheck() {
    return { status: 'ok', message: 'Webhook endpoint ativo' }
  }

  /**
   * POST /pontosimples/webhook
   * Endpoint que o PontoSimples chama quando um ponto é registrado.
   * Sem autenticação JWT — validação é pela verification_key.
   */
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async receiveWebhook(
    @Body() body: PontoSimplesPayload,
    @Headers('x-verification-key') headerKey?: string,
  ) {
    this.logger.log('━━━ Webhook PontoSimples recebido ━━━')
    this.logger.log(`Status: ${body?.status}`)
    this.logger.log(`Verification key (header): ${headerKey ? '***' + headerKey.slice(-6) : '(não enviada)'}`)
    this.logger.log(`Verification key (body): ${body?.verification_key ? '***' + body.verification_key.slice(-6) : '(não enviada)'}`)
    if (body?.data) {
      const d = body.data
      this.logger.log(`Dados recebidos:`)
      this.logger.log(`  user_name: ${d.user_name ?? '(vazio)'}`)
      this.logger.log(`  user_id:   ${d.user_id ?? '(vazio)'}`)
      this.logger.log(`  date:      ${d.date ?? '(vazio)'}`)
      this.logger.log(`  time:      ${d.time ?? '(vazio)'}`)
      this.logger.log(`  datetime:  ${d.datetime ?? '(vazio)'}`)
      this.logger.log(`  source:    ${d.source ?? '(vazio)'}`)
      this.logger.log(`  id:        ${d.id ?? '(vazio)'}`)
      this.logger.log(`  user_cpf:  ${d.user_cpf ?? '(vazio)'}`)
      this.logger.log(`  user_pis:  ${d.user_pis ?? '(vazio)'}`)
      this.logger.log(`  team_name: ${d.team_name ?? '(vazio)'}`)
      this.logger.log(`  lat/lng:   ${d.latitude ?? '-'}, ${d.longitude ?? '-'}`)
      this.logger.log(`  photo_url: ${d.photo_url ?? '(sem foto)'}`)
    } else {
      this.logger.warn('Payload recebido SEM campo data')
    }

    const verificationKey = headerKey || body?.verification_key
    if (!this.service.validateKey(verificationKey)) {
      this.logger.warn('Webhook REJEITADO: chave de verificação inválida')
      throw new UnauthorizedException('Chave de verificação inválida')
    }
    this.logger.log('Chave de verificação OK — processando...')

    const result = await this.service.processWebhook(body)
    this.logger.log(`Resultado: ${JSON.stringify(result)}`)
    this.logger.log('━━━ Fim do webhook ━━━')
    return result
  }

  /**
   * GET /pontosimples/config
   * Retorna informações de configuração do webhook.
   */
  @Get('config')
  getConfig() {
    const port = process.env.PORT || 3002
    return {
      webhookUrl: `${process.env.BACKEND_URL || `http://localhost:${port}`}/pontosimples/webhook`,
      verificationKeyConfigured: !!this.service.getVerificationKey(),
    }
  }

  /**
   * POST /pontosimples/test
   * Testa a conectividade do webhook sem criar registros.
   */
  @Post('test')
  @HttpCode(HttpStatus.OK)
  async testConnection(
    @Body() body?: { verification_key?: string },
    @Headers('x-verification-key') headerKey?: string,
  ) {
    const verificationKey = headerKey || body?.verification_key
    console.log('Testando conexão com chave:', verificationKey)
    return this.service.testConnection(verificationKey)
  }
}
