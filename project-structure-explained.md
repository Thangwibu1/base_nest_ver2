# NestJS Project Structure (Entity nằm trong từng Module) — Giải thích chi tiết

Tài liệu này giải thích **kỹ, rõ và thực dụng** cho cấu trúc project NestJS theo hướng:

- Feature-first (`modules/users`, `modules/mentorships`, ...)
- Áp dụng **SRP + DIP**
- **Entity đặt trong từng module** (thay vì gom ở `infrastructure/database/entities`)
- Dễ mở rộng, dễ test, dễ onboarding cho team

---

## 1) Mục tiêu kiến trúc

1. **Đọc code theo feature**: vào `users/` là thấy gần như toàn bộ logic của users.
2. **Tách business khỏi công nghệ**: service không phụ thuộc trực tiếp TypeORM.
3. **Đổi DB adapter ít ảnh hưởng business**: thay TypeORM bằng Prisma/SQL raw chỉ cần đổi lớp repository implementation.
4. **Mỗi file một vai trò rõ ràng**: controller, service, repository, dto, entity, type.

---

## 2) Cấu trúc thư mục khuyến nghị

```text
project-root/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── common/
    │   ├── constants/
    │   ├── decorators/
    │   ├── exceptions/
    │   ├── filters/
    │   ├── guards/
    │   ├── interceptors/
    │   ├── pipes/
    │   ├── types/
    │   ├── utils/
    │   └── repositories/                    # (optional) base repository dùng chung
    │       ├── base.repository.interface.ts
    │       └── base.typeorm.repository.ts
    │
    ├── config/
    │   ├── env.config.ts
    │   ├── validation.ts
    │   └── index.ts
    │
    ├── infrastructure/
    │   ├── database/
    │   │   ├── database.module.ts
    │   │   ├── typeorm.config.ts
    │   │   ├── migrations/
    │   │   └── subscribers/                # optional
    │   ├── redis/
    │   │   ├── redis.module.ts
    │   │   └── redis.service.ts
    │   └── logger/
    │       └── logger.module.ts
    │
    ├── modules/
    │   ├── users/
    │   │   ├── dtos/
    │   │   │   ├── create-user.dto.ts
    │   │   │   ├── update-user.dto.ts
    │   │   │   └── user-response.dto.ts
    │   │   ├── types/
    │   │   │   └── user.type.ts
    │   │   ├── entities/
    │   │   │   └── user.entity.ts
    │   │   ├── interfaces/
    │   │   │   └── user.repository.interface.ts
    │   │   ├── repositories/
    │   │   │   └── user.typeorm.repository.ts
    │   │   ├── services/
    │   │   │   └── users.service.ts
    │   │   ├── users.controller.ts
    │   │   └── users.module.ts
    │   │
    │   └── mentorships/
    │       ├── dtos/
    │       │   ├── request-mentorship.dto.ts
    │       │   └── update-mentorship-status.dto.ts
    │       ├── types/
    │       │   └── mentorship.type.ts
    │       ├── entities/
    │       │   └── mentor-mentee.entity.ts
    │       ├── interfaces/
    │       │   └── mentorship.repository.interface.ts
    │       ├── repositories/
    │       │   └── mentorship.typeorm.repository.ts
    │       ├── services/
    │       │   └── mentorships.service.ts
    │       ├── mentorships.controller.ts
    │       └── mentorships.module.ts
    │
    └── tests/                               # optional
```

---

## 3) Giải thích chi tiết từng thư mục và vai trò

## 3.1 `main.ts`

**Làm gì?**
- Bootstrap ứng dụng NestJS.
- Gắn global middleware/pipes/interceptors/filters.
- Lắng nghe cổng server.

**Chức năng cụ thể**
- Bật `ValidationPipe` global để validate DTO tự động.
- Cấu hình CORS, prefix API (`/api/v1`).
- Bật shutdown hooks, logger nếu cần.

---

## 3.2 `app.module.ts`

**Làm gì?**
- “Module gốc” của toàn hệ thống.

**Chức năng cụ thể**
- Import `ConfigModule`, `DatabaseModule`, `RedisModule`, `UsersModule`, `MentorshipsModule`.
- Không chứa business logic.

---

## 3.3 `common/` — thành phần dùng chung toàn app

### `common/constants/`
- Chứa constants dùng toàn hệ thống: TTL cache, key prefix, role names, regex, pagination defaults.
- Nên đặt DI tokens ở đây để tránh typo (`USER_REPOSITORY_TOKEN`).

### `common/decorators/`
- Tạo decorator tái sử dụng như `@CurrentUser()`, `@Roles()`, `@Public()`.
- Giúp controller code gọn và dễ đọc.

### `common/exceptions/`
- Custom exception class (ví dụ `BusinessException`, `ResourceNotFoundException`).
- Chuẩn hóa cách ném lỗi nghiệp vụ.

### `common/filters/`
- Exception filter để format response lỗi thống nhất (statusCode, message, errorCode, timestamp, path).
- Tách format lỗi ra khỏi service/controller.

### `common/guards/`
- Auth guard, Role guard, Permission guard.
- Kiểm soát truy cập ở rìa API.

### `common/interceptors/`
- Logging, response transform, timeout, audit interceptors.
- Tốt cho cross-cutting concerns.

### `common/pipes/`
- Parse/validate input đặc thù.
- Ví dụ: parse UUID, validate danh sách IDs, sanitize chuỗi.

### `common/types/`
- Type/interface dùng đa module (pagination result, base response, auth payload).

### `common/utils/`
- Hàm thuần hỗ trợ (date, hash helper wrapper, normalize text, format lỗi).

### `common/repositories/` (optional)
- Chứa base repository generic để giảm lặp CRUD cơ bản.
- **Chỉ dùng khi phù hợp**; không ép mọi feature dùng generic base nếu query đặc thù.

---

## 3.4 `config/`

### `env.config.ts`
- Đọc biến môi trường, tạo object config typed.

### `validation.ts`
- Validate `.env` bằng Joi/Zod.
- Thiếu biến quan trọng thì fail ngay khi start app.

### `index.ts`
- Gom export để import config gọn (`import { appConfig } from 'src/config'`).

---

## 3.5 `infrastructure/` — phần kết nối kỹ thuật

## `infrastructure/database/`

### `database.module.ts`
- Tạo và export kết nối DB cho toàn app.
- Thường wrap `TypeOrmModule.forRootAsync(...)`.

### `typeorm.config.ts`
- Chứa config TypeORM: host, port, user, pass, db name, logging, migrations, entities path.
- Quyết định chính sách schema (`synchronize: false` cho production).

### `migrations/`
- Nơi lưu migration files.
- Quản trị thay đổi schema theo thời gian một cách an toàn.

### `subscribers/` (optional)
- Hook lifecycle của entity (`beforeInsert`, `afterUpdate`...) nếu cần audit/event.

> Lưu ý: Theo hướng mới, `infrastructure/database` **không chứa entities/** nữa.

## `infrastructure/redis/`

### `redis.module.ts`
- Khởi tạo Redis client/provider, export cho module khác dùng.

### `redis.service.ts`
- Wrapper thao tác cache: `get/set/del`, serialize/deserialize, naming key.
- Giúp business code không phụ thuộc trực tiếp API client redis thấp tầng.

## `infrastructure/logger/`

### `logger.module.ts`
- Cấu hình logger thống nhất toàn app (Winston/Pino).
- Tạo logger service có context rõ ràng theo module.

---

## 3.6 `modules/` — trái tim business theo feature

Mỗi feature nên tự chứa đầy đủ thành phần để team nhìn vào là hiểu toàn bộ luồng.

## Ví dụ `modules/users/`

### `dtos/`
- `create-user.dto.ts`: schema input tạo user, validate request body.
- `update-user.dto.ts`: schema input cập nhật user.
- `user-response.dto.ts`: chuẩn hóa output trả cho client.

### `types/`
- `user.type.ts`: model nghiệp vụ độc lập TypeORM.
- Service nên làm việc với type này thay vì entity.

### `entities/`
- `user.entity.ts`: mô tả bảng/cột/quan hệ phục vụ persistence với TypeORM.
- Chỉ repository nên chạm trực tiếp entity.

### `interfaces/`
- `user.repository.interface.ts`: contract repository (DIP).
- Service chỉ biết contract, không cần biết class implement nào.

### `repositories/`
- `user.typeorm.repository.ts`: class implement interface bằng TypeORM.
- Nhiệm vụ:
  1) query DB,
  2) map `Entity -> Business Type`,
  3) map chiều ngược lại khi save/update.

### `services/`
- `users.service.ts`: xử lý nghiệp vụ (validate rule, policy, orchestrate flow).
- Không viết câu lệnh SQL/ORM trực tiếp tại đây.

### `users.controller.ts`
- HTTP adapter: nhận request, gọi service, trả status/response.
- Không chứa business logic phức tạp.

### `users.module.ts`
- Wiring nội bộ users feature.
- Đăng ký:
  - `TypeOrmModule.forFeature([UserEntity])`
  - Provider token repository
  - Service, controller

## `modules/mentorships/`
Tương tự users, chỉ khác domain nghiệp vụ.

---

## 3.7 `tests/`

- Setup test utils dùng lại (factory data, test app bootstrap, mock auth).
- Có thể tách integration test/module test tùy team.

---

## 4) Vì sao đặt `entity` trong module là hợp lý?

1. **Tăng tính đóng gói theo feature**: đọc module thấy cả DTO, service, repo, entity.
2. **Giảm context switching**: dev không phải nhảy giữa `modules/*` và `infrastructure/database/entities`.
3. **Ownership rõ ràng**: team nào làm `users` sẽ quản luôn schema của users.
4. **Scale team tốt**: domain nào đổi thì sửa trong domain đó.

### Nhược điểm cần kiểm soát
- Nếu relation giữa modules phức tạp, phải thống nhất import path và naming rõ ràng.
- Cần quy tắc migration chặt để tránh thay schema tùy tiện.

---

## 5) Luồng request chuẩn (end-to-end)

1. Client gọi API vào `Controller`.
2. Controller validate bằng DTO.
3. Controller gọi `Service`.
4. Service xử lý nghiệp vụ + cache strategy.
5. Service gọi `Repository Interface`.
6. `Repository Implementation` query TypeORM qua Entity.
7. Repository map dữ liệu về business type.
8. Service trả kết quả cho Controller.
9. Controller trả response DTO cho client.

Luồng này giúp test từng lớp dễ dàng và boundary rõ ràng.

---

## 6) Nguyên tắc SOLID áp dụng thực tế

## SRP (Single Responsibility Principle)
- Controller: HTTP concerns.
- Service: business concerns.
- Repository: data access concerns.
- DTO: contract/validation concerns.
- Entity: persistence mapping concerns.

## DIP (Dependency Inversion Principle)
- Service phụ thuộc interface/token (vd: `IUserRepository`, `USER_REPOSITORY_TOKEN`).
- Module quyết định implementation (`useClass: UserTypeOrmRepository`).
- Đổi công nghệ persistence không phải sửa business service.

---

## 7) Quy tắc đặt tên đề xuất

- Module: số nhiều theo domain: `users`, `orders`, `mentorships`.
- DTO: `create-*.dto.ts`, `update-*.dto.ts`, `*-response.dto.ts`.
- Interface: `*.repository.interface.ts`.
- Repository impl: `*.typeorm.repository.ts`.
- Service: `*.service.ts`.
- Type: `*.type.ts`.
- Entity: `*.entity.ts`.

---

## 8) Checklist tạo feature mới (chuẩn team)

- [ ] Tạo `src/modules/<feature>/`
- [ ] Tạo `dtos/` cho input/output
- [ ] Tạo `types/` business độc lập ORM
- [ ] Tạo `entities/` của feature
- [ ] Tạo `interfaces/*repository.interface.ts`
- [ ] Tạo `repositories/*typeorm.repository.ts`
- [ ] Tạo `services/*.service.ts`
- [ ] Tạo `<feature>.controller.ts`
- [ ] Wiring trong `<feature>.module.ts` (provider token + forFeature entity)
- [ ] Tạo migration cho thay đổi schema
- [ ] Viết test cơ bản cho service/controller

---

## 9) Mẫu wiring module theo DIP (concept)

Trong `<feature>.module.ts` bạn sẽ có các ý chính:

1. Đăng ký entity của feature bằng `TypeOrmModule.forFeature([...])`
2. Đăng ký repository implementation với token
3. Inject token đó trong service

Ví dụ token:
- `USER_REPOSITORY_TOKEN = 'IUserRepository'`

Mục tiêu: Service không biết và không phụ thuộc class TypeORM cụ thể.

---

## 10) Kết luận

Cấu trúc này cân bằng giữa:

- Tính thực dụng cho team NestJS
- Kiến trúc sạch (SRP + DIP)
- Khả năng mở rộng khi số module tăng
- Dễ maintain dài hạn

Nếu đi theo hướng này nhất quán ngay từ đầu, project sẽ tránh được tình trạng “mọi thứ dồn vào service/controller”, và việc thay đổi công nghệ hạ tầng sau này sẽ nhẹ nhàng hơn nhiều.
