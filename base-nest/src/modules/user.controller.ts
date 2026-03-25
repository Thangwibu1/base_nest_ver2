import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvConfig } from 'src/config/env.config';
import { Get } from '@nestjs/common';

@Controller('user')
export class UserController {
  constructor(private readonly configService: ConfigService<EnvConfig>) {}

  @Get()
  findAll() {
    return this.configService.get('app.apiPrefix', { infer: true });
  }
}
