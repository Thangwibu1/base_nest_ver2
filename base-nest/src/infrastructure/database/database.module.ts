import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getTypeOrmConfig } from './typeorm.config';
import { EnvConfig } from 'src/config/env.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      // imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig>) =>
        getTypeOrmConfig(configService),
    }),
  ],
})
export class DatabaseModule {}
