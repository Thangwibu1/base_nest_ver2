import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvConfig } from 'src/config/env.config';

export const getTypeOrmConfig = (
  configService: ConfigService<EnvConfig>,
): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get('db.url', { infer: true }),
  ssl: { rejectUnauthorized: false },

  entities: [__dirname + '/../../modules/**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/migrations/*{.ts,.js}'],

  synchronize: false,
  logging: true,
  migrationsRun: false,
});
