# Hướng dẫn FULL từ A-Z: NestJS Feature Module + TypeORM + PostgreSQL (Entity trong từng Module)

Tài liệu này hướng dẫn bạn làm **từ đầu đến cuối** chỉ với PostgreSQL:

1. Tạo project NestJS
2. Cài thư viện cần thiết
3. Tạo cấu trúc thư mục chuẩn
4. Kết nối PostgreSQL
5. Tạo module mẫu `users` đúng SRP + DIP
6. Tạo entity SQL mẫu + migration
7. Import dữ liệu mẫu (seed)
8. Chạy thử end-to-end

---

## 0) Stack và quy ước

- Node.js: >= 20
- NestJS: latest ổn định
- DB: PostgreSQL
- ORM: TypeORM
- Kiến trúc: Feature-first (`src/modules/*`)
- Entity nằm trong từng module: `src/modules/<feature>/entities/*.entity.ts`

---

## 1) Khởi tạo project

```bash
npm i -g @nestjs/cli
nest new base-nest
cd base-nest
```

Xóa demo nếu muốn sạch:

```bash
rm -f src/app.controller.ts src/app.service.ts src/app.controller.spec.ts
```

Windows PowerShell:

```powershell
Remove-Item src/app.controller.ts,src/app.service.ts,src/app.controller.spec.ts -ErrorAction SilentlyContinue
```

---

## 2) Cài thư viện

### 2.1 Runtime dependencies

```bash
npm i @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer
```

### 2.2 Dev dependencies

```bash
npm i -D zod ts-node tsconfig-paths
```

---

## 3) Tạo cấu trúc folder chuẩn

```bash
mkdir -p src/common/constants src/common/decorators src/common/exceptions src/common/filters src/common/guards src/common/interceptors src/common/pipes src/common/types src/common/utils src/common/repositories
mkdir -p src/config
mkdir -p src/infrastructure/database/migrations src/infrastructure/database/subscribers
mkdir -p src/modules
mkdir -p src/scripts/seeds
```

---

## 3.1) Bổ sung Base Repository (optional nhưng hữu ích)

Bạn đúng, phần này cần có để tái sử dụng CRUD cơ bản.

Tạo 2 file:

- `src/common/repositories/base.repository.interface.ts`
- `src/common/repositories/base.typeorm.repository.ts`

### `src/common/repositories/base.repository.interface.ts`

```ts
export interface IBaseRepository<T, TId = string> {
  create(data: Partial<T>): Promise<T>;
  findById(id: TId): Promise<T | null>;
  findAll(): Promise<T[]>;
  update(id: TId, data: Partial<T>): Promise<T | null>;
  delete(id: TId): Promise<boolean>;
}
```

### `src/common/repositories/base.typeorm.repository.ts`

```ts
import {
  DeepPartial,
  FindOptionsWhere,
  ObjectLiteral,
  Repository,
} from "typeorm";
import { IBaseRepository } from "./base.repository.interface";

export abstract class BaseTypeOrmRepository<
  T extends ObjectLiteral,
  TId = string,
> implements IBaseRepository<T, TId> {
  protected constructor(protected readonly repository: Repository<T>) {}

  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    return this.repository.save(entity);
  }

  async findById(id: TId): Promise<T | null> {
    return this.repository.findOne({
      where: { id } as unknown as FindOptionsWhere<T>,
    });
  }

  async findAll(): Promise<T[]> {
    return this.repository.find();
  }

  async update(id: TId, data: DeepPartial<T>): Promise<T | null> {
    await this.repository.update(id as never, data as never);
    return this.findById(id);
  }

  async delete(id: TId): Promise<boolean> {
    const result = await this.repository.delete(id as never);
    return !!result.affected && result.affected > 0;
  }
}
```

### Cách dùng trong repository theo feature

Ví dụ `user.typeorm.repository.ts` có thể `extends BaseTypeOrmRepository<UserEntity>` rồi thêm các method đặc thù như `findByEmail`.

> Lưu ý: Base repository là **tùy chọn**. Nếu feature có query đặc thù nhiều, bạn có thể không dùng base để tránh generic quá mức.

---

## 4) Tạo file môi trường

### 4.1 Dùng PostgreSQL local

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
DB_HOST=127.0.0.1
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=base_nest
DB_SSL=false
```

### 4.2 Dùng Neon (khuyến nghị dùng `DATABASE_URL`)

```env
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1

DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require
DB_SSL=true
```

> Với Neon, biến quan trọng nhất là `DATABASE_URL` có `sslmode=require`.

---

## 5) Cấu hình Config module (Zod)

### 5.1 `src/config/validation.ts`

```ts
import { z } from "zod";

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    API_PREFIX: z.string().default("api/v1"),

    DATABASE_URL: z.string().url().optional(),

    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().optional(),
    DB_SSL: z.coerce.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.DATABASE_URL) {
      const required = [
        "DB_HOST",
        "DB_PORT",
        "DB_USER",
        "DB_PASSWORD",
        "DB_NAME",
      ] as const;
      for (const key of required) {
        if (!data[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when DATABASE_URL is not provided`,
            path: [key],
          });
        }
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>) {
  return envSchema.parse(config);
}
```

### 5.2 `src/config/env.config.ts`

```ts
export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV || "development",
    port: Number(process.env.PORT || 3000),
    apiPrefix: process.env.API_PREFIX || "api/v1",
  },
  db: {
    url: process.env.DATABASE_URL,
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 5432),
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: String(process.env.DB_SSL) === "true",
  },
});
```

### 5.3 `src/config/index.ts`

```ts
export { default as envConfig } from "./env.config";
export { validateEnv } from "./validation";
```

---

## 6) Cấu hình TypeORM + Database module

### 6.1 `src/infrastructure/database/typeorm.config.ts`

```ts
import { ConfigService } from "@nestjs/config";
import { TypeOrmModuleOptions } from "@nestjs/typeorm";

export const getTypeOrmConfig = (
  configService: ConfigService,
): TypeOrmModuleOptions => ({
  type: "postgres",
  url: configService.get<string>("db.url"),
  host: configService.get<string>("db.host"),
  port: configService.get<number>("db.port"),
  username: configService.get<string>("db.username"),
  password: configService.get<string>("db.password"),
  database: configService.get<string>("db.database"),
  ssl: configService.get<boolean>("db.ssl")
    ? { rejectUnauthorized: false }
    : false,

  entities: [__dirname + "/../../modules/**/*.entity{.ts,.js}"],
  migrations: [__dirname + "/migrations/*{.ts,.js}"],

  synchronize: false,
  logging: true,
  migrationsRun: false,
});
```

### 6.2 `src/infrastructure/database/database.module.ts`

```ts
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { getTypeOrmConfig } from "./typeorm.config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getTypeOrmConfig(configService),
    }),
  ],
})
export class DatabaseModule {}
```

---

## 7) Cập nhật entry files

### 7.1 `src/main.ts`

```ts
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.setGlobalPrefix(configService.get<string>("app.apiPrefix") || "api/v1");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = configService.get<number>("app.port") || 3000;
  await app.listen(port);
}
bootstrap();
```

### 7.2 `src/app.module.ts`

```ts
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { envConfig, validateEnv } from "./config";
import { DatabaseModule } from "./infrastructure/database/database.module";
import { UsersModule } from "./modules/users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [envConfig],
      validate: validateEnv,
    }),
    DatabaseModule,
    UsersModule,
  ],
})
export class AppModule {}
```

---

## 8) Tạo module mẫu `users`

Tạo folder:

```bash
mkdir -p src/modules/users/{dtos,types,entities,interfaces,repositories,services}
```

### `src/modules/users/entities/user.entity.ts`

```ts
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from "typeorm";

@Entity({ name: "users" })
@Unique(["email"])
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "varchar", length: 120 })
  fullName: string;

  @Column({ type: "varchar", length: 180 })
  email: string;

  @Column({ type: "varchar", length: 255 })
  passwordHash: string;

  @CreateDateColumn({ type: "timestamptz" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamptz" })
  updatedAt: Date;
}
```

### `src/modules/users/interfaces/user.repository.interface.ts`

```ts
import { UserType } from "../types/user.type";

export interface IUserRepository {
  create(input: {
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserType>;
  findByEmail(email: string): Promise<UserType | null>;
  findAll(): Promise<UserType[]>;
}
```

### `src/modules/users/types/user.type.ts`

```ts
export type UserType = {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};
```

### `src/modules/users/repositories/user.typeorm.repository.ts`

```ts
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { UserEntity } from "../entities/user.entity";
import { IUserRepository } from "../interfaces/user.repository.interface";
import { UserType } from "../types/user.type";

@Injectable()
export class UserTypeOrmRepository implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity) private readonly repo: Repository<UserEntity>,
  ) {}

  async create(input: {
    fullName: string;
    email: string;
    passwordHash: string;
  }): Promise<UserType> {
    const entity = this.repo.create(input);
    const saved = await this.repo.save(entity);
    return this.toType(saved);
  }

  async findByEmail(email: string): Promise<UserType | null> {
    const entity = await this.repo.findOne({ where: { email } });
    return entity ? this.toType(entity) : null;
  }

  async findAll(): Promise<UserType[]> {
    const entities = await this.repo.find({ order: { createdAt: "DESC" } });
    return entities.map((e) => this.toType(e));
  }

  private toType(entity: UserEntity): UserType {
    return {
      id: entity.id,
      fullName: entity.fullName,
      email: entity.email,
      passwordHash: entity.passwordHash,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}
```

### `src/modules/users/dtos/create-user.dto.ts`

```ts
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}
```

### `src/modules/users/dtos/user-response.dto.ts`

```ts
export class UserResponseDto {
  id: string;
  fullName: string;
  email: string;
  createdAt: Date;
}
```

### `src/modules/users/services/users.service.ts`

```ts
import { ConflictException, Inject, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { CreateUserDto } from "../dtos/create-user.dto";
import { UserResponseDto } from "../dtos/user-response.dto";
import { IUserRepository } from "../interfaces/user.repository.interface";

export const USER_REPOSITORY_TOKEN = "IUserRepository";

@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
  ) {}

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const existed = await this.userRepository.findByEmail(dto.email);
    if (existed) throw new ConflictException("Email already exists");

    const passwordHash = createHash("sha256")
      .update(dto.password)
      .digest("hex");
    const created = await this.userRepository.create({
      fullName: dto.fullName,
      email: dto.email,
      passwordHash,
    });

    return {
      id: created.id,
      fullName: created.fullName,
      email: created.email,
      createdAt: created.createdAt,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.userRepository.findAll();
    return users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      createdAt: u.createdAt,
    }));
  }
}
```

### `src/modules/users/users.controller.ts`

```ts
import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateUserDto } from "./dtos/create-user.dto";
import { UserResponseDto } from "./dtos/user-response.dto";
import { UsersService } from "./services/users.service";

@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto): Promise<UserResponseDto> {
    return this.usersService.create(dto);
  }

  @Get()
  findAll(): Promise<UserResponseDto[]> {
    return this.usersService.findAll();
  }
}
```

### `src/modules/users/users.module.ts`

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserEntity } from "./entities/user.entity";
import { UserTypeOrmRepository } from "./repositories/user.typeorm.repository";
import { UsersController } from "./users.controller";
import { USER_REPOSITORY_TOKEN, UsersService } from "./services/users.service";

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity])],
  controllers: [UsersController],
  providers: [
    UsersService,
    { provide: USER_REPOSITORY_TOKEN, useClass: UserTypeOrmRepository },
  ],
  exports: [UsersService],
})
export class UsersModule {}
```

---

## 9) Migration + DB init

### 9.1 `src/infrastructure/database/data-source.ts`

```ts
import "dotenv/config";
import { DataSource } from "typeorm";

export default new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    String(process.env.DB_SSL) === "true"
      ? { rejectUnauthorized: false }
      : false,
  entities: ["src/modules/**/*.entity.ts"],
  migrations: ["src/infrastructure/database/migrations/*.ts"],
  synchronize: false,
});
```

### 9.2 Generate + run migration

```bash
npx typeorm-ts-node-commonjs migration:generate src/infrastructure/database/migrations/CreateUsersTable -d src/infrastructure/database/data-source.ts
npx typeorm-ts-node-commonjs migration:run -d src/infrastructure/database/data-source.ts
```

---

## 10) Seed/import dữ liệu mẫu

### 10.1 `src/scripts/seeds/seed-users.ts`

```ts
import "dotenv/config";
import { DataSource } from "typeorm";
import { createHash } from "crypto";
import { UserEntity } from "../../modules/users/entities/user.entity";

const dataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl:
    String(process.env.DB_SSL) === "true"
      ? { rejectUnauthorized: false }
      : false,
  entities: [UserEntity],
});

async function seed() {
  await dataSource.initialize();
  const repo = dataSource.getRepository(UserEntity);

  const users = [
    {
      fullName: "Alice Nguyen",
      email: "alice@example.com",
      password: "123456",
    },
    { fullName: "Bob Tran", email: "bob@example.com", password: "123456" },
    {
      fullName: "Charlie Le",
      email: "charlie@example.com",
      password: "123456",
    },
  ];

  for (const user of users) {
    const existed = await repo.findOne({ where: { email: user.email } });
    if (existed) continue;

    const passwordHash = createHash("sha256")
      .update(user.password)
      .digest("hex");
    await repo.save(
      repo.create({ fullName: user.fullName, email: user.email, passwordHash }),
    );
  }

  await dataSource.destroy();
  console.log("Seed users done");
}

seed().catch(async (error) => {
  console.error(error);
  if (dataSource.isInitialized) await dataSource.destroy();
  process.exit(1);
});
```

### 10.2 Script `package.json`

```json
{
  "scripts": {
    "start:dev": "nest start --watch",
    "migration:generate": "typeorm-ts-node-commonjs migration:generate src/infrastructure/database/migrations/AutoMigration -d src/infrastructure/database/data-source.ts",
    "migration:run": "typeorm-ts-node-commonjs migration:run -d src/infrastructure/database/data-source.ts",
    "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/infrastructure/database/data-source.ts",
    "seed:users": "ts-node -r tsconfig-paths/register src/scripts/seeds/seed-users.ts"
  }
}
```

---

## 11) Docker Compose cho PostgreSQL

Tạo `docker-compose.yml`:

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    container_name: base_nest_postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: base_nest
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data

volumes:
  pgdata:
```

Chạy:

```bash
docker compose up -d
```

---

## 12) Quy trình chạy full từ đầu tới cuối

1. Khởi động PostgreSQL

```bash
docker compose up -d
```

2. Chạy migration

```bash
npm run migration:run
```

3. Seed dữ liệu mẫu

```bash
npm run seed:users
```

4. Start app

```bash
npm run start:dev
```

5. Test API

- `GET http://localhost:3000/api/v1/users`
- `POST http://localhost:3000/api/v1/users`

Body mẫu:

```json
{
  "fullName": "David Pham",
  "email": "david@example.com",
  "password": "123456"
}
```

---

## 13) Checklist Done

- [ ] Cài dependencies thành công
- [ ] Env validation chạy đúng
- [ ] PostgreSQL kết nối thành công
- [ ] Migration tạo bảng users thành công
- [ ] Seed import dữ liệu thành công
- [ ] API users hoạt động đúng
- [ ] Service không phụ thuộc trực tiếp ORM class

---

Nếu bạn muốn, bước tiếp theo mình có thể tạo thêm bản `sample-project-guide-with-hygen.md` riêng (vẫn dùng PostgreSQL-only, nhưng có thêm tự động generate module bằng Hygen).
