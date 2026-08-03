import { Module } from '@nestjs/common';
import { SolicitudesBajaService } from './solicitudes-baja.service';
import { SolicitudesBajaController } from './solicitudes-baja.controller';

@Module({
  controllers: [SolicitudesBajaController],
  providers: [SolicitudesBajaService],
})
export class SolicitudesBajaModule {}
