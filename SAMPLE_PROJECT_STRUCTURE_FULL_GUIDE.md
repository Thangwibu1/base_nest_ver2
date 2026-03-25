# Sample Project - Full Structure Guide

Tài liệu này tập trung giải thích rõ 3 phần bạn hỏi thêm: `common`, `config`, `infrastructure`, kèm code mẫu để bạn áp dụng ngay.

---

## 1) `src/common` - Thư viện dùng chung toàn hệ thống

Mục tiêu của `common` là tránh lặp code giữa các module (`user`, `product`, `order`, ...).

### 1.1 `common/entities/base.entity.ts`

**Vai trò**

- Entity cha cho mọi bảng trong DB.
- Chuẩn hóa các cột hệ thống: `id`, `createdAt`, `updatedAt`.

**Code mẫu đang có**

```ts
import {
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export abstract class BaseEntity {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
```

**Cách dùng trong module**

```ts
@Entity({ name: "users" })
export class UserEntity extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  name: string;
}
```

### 1.2 `common/constants/`

**Vai trò**

- Chứa hằng số dùng chung: role, message code, cache key prefix...

**Code mẫu gợi ý**

```ts
export const APP_ERROR_CODE = {
  VALIDATION_FAILED: "VALIDATION_FAILED",
  NOT_FOUND: "NOT_FOUND",
} as const;
```

### 1.3 `common/decorators/`

**Vai trò**

- Custom decorators cho controller/guard.

**Code mẫu gợi ý**

```ts
import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
```

### 1.4 `common/exceptions/`

**Vai trò**

- Custom exception class theo business.

**Code mẫu gợi ý**

```ts
import { BadRequestException } from "@nestjs/common";

export class DomainException extends BadRequestException {
  constructor(message: string) {
    super({ code: "DOMAIN_ERROR", message });
  }
}
```

### 1.5 `common/filters/`

**Vai trò**

- Chuẩn hóa format error response toàn hệ thống.

**Code mẫu gợi ý**

```ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";

@Catch(HttpException)
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    response.status(exception.getStatus()).json({
      success: false,
      error: exception.getResponse(),
    });
  }
}
```

### 1.6 `common/guards/`

**Vai trò**

- Bảo vệ route (JWT, role-based, permission).

**Code mẫu gợi ý**

```ts
import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return true; // thay bằng logic verify token
  }
}
```

### 1.7 `common/interceptors/`

**Vai trò**

- Biến đổi response, đo thời gian, logging request.

**Code mẫu gợi ý**

```ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { map } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map((data) => ({ success: true, data })));
  }
}
```

### 1.8 `common/pipes/`

**Vai trò**

- Parse/validate input trước khi vào controller method.

**Code mẫu gợi ý**

```ts
import { PipeTransform, Injectable, BadRequestException } from "@nestjs/common";

@Injectable()
export class ParsePositiveIntPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const n = Number(value);
    if (!Number.isInteger(n) || n <= 0)
      throw new BadRequestException("Invalid id");
    return n;
  }
}
```

### 1.9 `common/repositories/`

**Vai trò**

- Base abstraction cho repository (nếu bạn theo DDD/repository pattern).

### 1.10 `common/types/`

**Vai trò**

- Type dùng chung nhiều module.

**Code mẫu gợi ý**

```ts
export type Nullable<T> = T | null;
```

### 1.11 `common/utils/`

**Vai trò**

- Hàm helper thuần (format date, hash, random...).

---

## 2) `src/config` - Cấu hình ứng dụng

Phần này gồm 2 file quan trọng và đang dùng thực tế trong `AppModule`.

### 2.1 `config/env.config.ts`

**Vai trò**

- Đọc `process.env` và map thành config object có cấu trúc.
- Giúp code truy cập config bằng key rõ ràng: `database.url`, `jwt.secret`.

**Code đang có**

```ts
export default () => ({
  environment: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT, 10) || 3000,
  apiPrefix: process.env.API_PREFIX || "/api/v1",
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || "",
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN,
  },
});
```

### 2.2 `config/validation.ts`

**Vai trò**

- Validate env ngay lúc app khởi động.
- Tránh app chạy với config lỗi/thiếu.

**Code đang có**

```ts
import * as Joi from "joi";

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test")
    .default("development"),
  PORT: Joi.number().default(3000),
  API_PREFIX: Joi.string().default("/api/v1"),

  DATABASE_URL: Joi.string().required(),

  REDIS_HOST: Joi.string().optional(),
  REDIS_PORT: Joi.number().default(6379),

  JWT_SECRET: Joi.string().optional(),
  JWT_EXPIRES_IN: Joi.string().optional(),
});
```

### 2.3 Cách `config` được gắn vào app

```ts
ConfigModule.forRoot({
  isGlobal: true,
  load: [envConfig],
  validationSchema: envValidationSchema,
});
```

---

## 3) `src/infrastructure` - Tầng hạ tầng kỹ thuật

Phần này chứa code kết nối với hệ thống bên ngoài (DB, Redis, Logger, MQ...).

### 3.1 `infrastructure/database/database.module.ts`

**Vai trò**

- Cấu hình TypeORM theo env.
- Mở kết nối Postgres.
- `autoLoadEntities` để tự nhận entity từ các module.

**Code đang có**

```ts
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule, ConfigService } from "@nestjs/config";

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        url: configService.get<string>("database.url"),
        autoLoadEntities: true,
        synchronize: configService.get<string>("environment") !== "production",
        logging: configService.get<string>("environment") === "development",
      }),
    }),
  ],
})
export class DatabaseModule {}
```

### 3.2 `infrastructure/database/migrations/`

**Vai trò**

- Chứa migration scripts để version hóa schema DB.

**Code mẫu migration**

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUsers1710000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE users (id uuid PRIMARY KEY)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
```

### 3.3 `infrastructure/database/subscribers/`

**Vai trò**

- Lắng nghe lifecycle entity (`beforeInsert`, `afterUpdate`...).

**Code mẫu**

```ts
import {
  EventSubscriber,
  EntitySubscriberInterface,
  InsertEvent,
} from "typeorm";
import { UserEntity } from "../../modules/user/entities/user.entity";

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<UserEntity> {
  listenTo() {
    return UserEntity;
  }

  beforeInsert(event: InsertEvent<UserEntity>) {
    // xử lý trước khi insert
  }
}
```

### 3.4 `infrastructure/logger/`

**Vai trò**

- Adapter logging tập trung (pino/winston/...)

**Code mẫu gợi ý**

```ts
export class AppLogger {
  log(message: string, context?: string) {
    console.log(`[${context ?? "App"}] ${message}`);
  }
}
```

### 3.5 `infrastructure/redis/`

**Vai trò**

- Adapter cache/pub-sub/rate-limit qua Redis.

**Code mẫu gợi ý**

```ts
export class RedisService {
  async get(_key: string) {
    return null;
  }

  async set(_key: string, _value: string) {
    return true;
  }
}
```

---

## 4) Mapping nhanh: khi nào đặt code vào đâu?

- Code dùng chung cho nhiều module -> `common/*`
- Code đọc/validate env -> `config/*`
- Code kết nối dịch vụ ngoài (DB/Redis/Logger) -> `infrastructure/*`
- Business theo feature -> `modules/<feature>/*`

---

## 5) Lệnh tạo module đúng chuẩn hiện tại

```bash
npm run gen:module -- user
```

Tự tạo đủ thư mục: `dtos`, `entities`, `interfaces`, `repositories`, `services`, `types`, `schema`.
