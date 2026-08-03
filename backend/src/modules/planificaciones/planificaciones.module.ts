import { Module } from '@nestjs/common';
import { PlanificacionesService } from './planificaciones.service';
import { PlanificacionesController } from './planificaciones.controller';
import { ComisionesModule } from '../comisiones/comisiones.module';

@Module({
  imports: [ComisionesModule],
  controllers: [PlanificacionesController],
  providers: [PlanificacionesService],
})
export class PlanificacionesModule {}
