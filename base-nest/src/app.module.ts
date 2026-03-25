import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envConfig, validateEnv } from './config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { UserModule } from './modules/users/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      // validate: validateEnv,
    }),
    DatabaseModule,
    UserModule,
  ],
})
export class AppModule {}
