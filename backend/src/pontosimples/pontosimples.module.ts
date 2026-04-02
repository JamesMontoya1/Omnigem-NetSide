import { Module } from '@nestjs/common'
import { PontoSimplesController } from './pontosimples.controller'
import { PontoSimplesService } from './pontosimples.service'

@Module({
  controllers: [PontoSimplesController],
  providers: [PontoSimplesService],
  exports: [PontoSimplesService],
})
export class PontoSimplesModule {}
