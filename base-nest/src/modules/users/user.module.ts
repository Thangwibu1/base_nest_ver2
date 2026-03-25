import { Module } from '@nestjs/common';
import { UserController } from '../user.controller';
import { ConfigModule } from '@nestjs/config/dist/config.module';

@Module({
  imports: [],
  controllers: [UserController],
})
export class UserModule {}
