import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { envValidationSchema } from './config/validation';
import envConfig from './config/env.config';
import { DatabaseModule } from './infrastructure/database/database.module';
import { UserModule } from './modules/user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validationSchema: envValidationSchema,
    }),
    DatabaseModule,
    UserModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
