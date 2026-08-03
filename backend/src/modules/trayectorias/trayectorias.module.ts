import { Module } from '@nestjs/common';
import { TrayectoriasService } from './trayectorias.service';
import { TrayectoriasController } from './trayectorias.controller';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [CommonModule],
  controllers: [TrayectoriasController],
  providers: [TrayectoriasService],
  exports: [TrayectoriasService],
})
export class TrayectoriasModule {}
