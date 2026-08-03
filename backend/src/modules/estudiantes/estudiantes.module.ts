import { Module } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { EstudiantesController } from './estudiantes.controller';
import { ComisionesModule } from '../comisiones/comisiones.module';

@Module({
  imports: [ComisionesModule],
  controllers: [EstudiantesController],
  providers: [EstudiantesService],
  exports: [EstudiantesService],
})
export class EstudiantesModule {}
