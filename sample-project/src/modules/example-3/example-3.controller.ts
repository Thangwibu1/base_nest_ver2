import { Controller, Get, Param } from '@nestjs/common';
import { Example3Service } from './services/example-3.service';

@Controller('example-3s')
export class Example3Controller {
  constructor(private readonly example-3Service: Example3Service) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.example-3Service.findOne(id);
  }
}

