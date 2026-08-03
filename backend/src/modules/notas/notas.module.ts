import { Module } from '@nestjs/common';
import { NotasService } from './notas.service';
import { NotasController } from './notas.controller';
import { ComisionesModule } from '../comisiones/comisiones.module';

@Module({
  imports: [ComisionesModule],
  controllers: [NotasController],
  providers: [NotasService],
})
export class NotasModule {}
