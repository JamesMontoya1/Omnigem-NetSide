import { Module } from '@nestjs/common';
import { TimePunchesController } from './time-punches.controller';
import { TimePunchesService } from './time-punches.service';
import { LocalTimePunchProvider } from './time-punch.provider';

/**
 * Quando a API do PontoSimples estiver disponível, trocar
 * LocalTimePunchProvider por PontoSimplesProvider aqui.
 */
@Module({
  controllers: [TimePunchesController],
  providers: [
    TimePunchesService,
    { provide: 'TIME_PUNCH_PROVIDER', useClass: LocalTimePunchProvider },
  ],
  exports: [TimePunchesService],
})
export class TimePunchesModule {}

