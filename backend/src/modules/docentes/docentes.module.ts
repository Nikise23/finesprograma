import { Module } from '@nestjs/common';
import { DocentesService } from './docentes.service';
import { DocentesController } from './docentes.controller';

@Module({
  controllers: [DocentesController],
  providers: [DocentesService],
  exports: [DocentesService],
})
export class DocentesModule {}
