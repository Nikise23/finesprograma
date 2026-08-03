import { Module } from '@nestjs/common';
import { LibrosMatricesService } from './libros-matrices.service';
import { LibrosMatricesController } from './libros-matrices.controller';

@Module({
  controllers: [LibrosMatricesController],
  providers: [LibrosMatricesService],
  exports: [LibrosMatricesService],
})
export class LibrosMatricesModule {}
