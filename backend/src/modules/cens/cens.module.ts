import { Module } from '@nestjs/common';
import { CensService } from './cens.service';
import { CensController } from './cens.controller';

@Module({
  controllers: [CensController],
  providers: [CensService],
  exports: [CensService],
})
export class CensModule {}
