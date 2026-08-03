import { Module } from '@nestjs/common';
import { ReportesService } from './reportes.service';
import { ReportesController } from './reportes.controller';
import { TrayectoriasModule } from '../trayectorias/trayectorias.module';

@Module({
  imports: [TrayectoriasModule],
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}