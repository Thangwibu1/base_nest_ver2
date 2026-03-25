import { Controller, Get, Param } from '@nestjs/common';
import { Example2Service } from './services/example-2.service';

@Controller('example-2s')
export class Example2Controller {
  constructor(private readonly example-2Service: Example2Service) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.example-2Service.findOne(id);
  }
}

