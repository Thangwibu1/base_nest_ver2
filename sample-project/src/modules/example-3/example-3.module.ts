import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Example3Controller } from './example-3.controller';
import { Example3Service } from './services/example-3.service';
import { Example3Entity } from './entities/example-3.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Example3Entity])],
  controllers: [Example3Controller],
  providers: [Example3Service],
  exports: [Example3Service],
})
export class Example3Module {}
