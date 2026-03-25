import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Example2Controller } from './example-2.controller';
import { Example2Service } from './services/example-2.service';
import { Example2Entity } from './entities/example-2.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Example2Entity])],
  controllers: [Example2Controller],
  providers: [Example2Service],
  exports: [Example2Service],
})
export class Example2Module {}
