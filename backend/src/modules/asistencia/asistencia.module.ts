import { Module } from '@nestjs/common';
import { AsistenciaService } from './asistencia.service';
import { AsistenciaController } from './asistencia.controller';
import { ComisionesModule } from '../comisiones/comisiones.module';

@Module({
  imports: [ComisionesModule],
  controllers: [AsistenciaController],
  providers: [AsistenciaService],
})
export class AsistenciaModule {}
