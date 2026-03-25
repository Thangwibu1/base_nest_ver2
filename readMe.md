# NestJS Folder Structure Guideline (SOLID + PostgreSQL + Redis + TypeORM)

Tài liệu này là guideline chuẩn để bạn dựng một dự án NestJS theo **Feature Module Architecture**, tập trung vào:

- **SRP (Single Responsibility Principle)**
- **DIP (Dependency Inversion Principle)**
- Dễ mở rộng, dễ test, không cồng kềnh như full DDD
- Tách rõ tầng `infrastructure` và `business`

---

## 1) Mục tiêu kiến trúc

1. **Tầng Service không phụ thuộc trực tiếp vào ORM** (TypeORM/Prisma/...)
2. **Mỗi file làm đúng 1 việc**: Controller nhận HTTP, Service xử lý nghiệp vụ, Repository truy cập dữ liệu
3. **Đổi công nghệ lưu trữ ít ảnh hưởng business logic**
4. **Codebase dễ đọc theo feature** (`users`, `mentorships`, ...)

---

## 2) Cấu trúc thư mục khuyến nghị (đầy đủ)

```text
project-root/
├── package.json
├── tsconfig.json
└── src/
    ├── main.ts
    ├── app.module.ts
    │
    ├── common/                              # Thành phần dùng chung toàn app
    │   ├── constants/
    │   ├── decorators/
    │   ├── exceptions/
    │   ├── filters/
    │   ├── guards/
    │   ├── interceptors/
    │   ├── pipes/
    │   ├── types/
    │   ├── utils/
    │   └── repositories/                    # Base repository dùng chung (tùy chọn)
    │       ├── base.repository.interface.ts
    │       └── base.typeorm.repository.ts
    │
    ├── config/                              # Cấu hình env + validation
    │   ├── env.config.ts
    │   ├── validation.ts
    │   └── index.ts
    │
    ├── infrastructure/                      # Kết nối ra ngoài (DB, Redis, queue, mail...)
    │   ├── database/
    │   │   ├── database.module.ts
    │   │   ├── typeorm.config.ts
    │   │   ├── entities/
    │   │   │   ├── user.entity.ts
    │   │   │   └── mentor-mentee.entity.ts
    │   │   ├── migrations/                 # migration files
    │   │   └── subscribers/                # (optional)
    │   ├── redis/
    │   │   ├── redis.module.ts
    │   │   └── redis.service.ts
    │   └── logger/
    │       └── logger.module.ts
    │
    ├── modules/                             # Feature modules (business-centric)
    │   ├── users/
    │   │   ├── dtos/
    │   │   │   ├── create-user.dto.ts
    │   │   │   ├── update-user.dto.ts
    │   │   │   └── user-response.dto.ts
    │   │   ├── types/                       # Business types độc lập ORM
    │   │   │   └── user.type.ts
    │   │   ├── interfaces/                  # DIP contracts
    │   │   │   └── user.repository.interface.ts
    │   │   ├── repositories/                # Infra adapter cho feature
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
    │       ├── interfaces/
    │       │   └── mentorship.repository.interface.ts
    │       ├── repositories/
    │       │   └── mentorship.typeorm.repository.ts
    │       ├── services/
    │       │   └── mentorships.service.ts
    │       ├── mentorships.controller.ts
    │       └── mentorships.module.ts
    │
    └── tests/                               # (optional) test utils/integration setup
```

---

## 3) Nguyên tắc chia trách nhiệm theo SOLID

### 3.1 SRP

- `*.controller.ts`: chỉ làm HTTP adapter (request/response, status code)
- `services/*.service.ts`: chỉ xử lý luật nghiệp vụ
- `repositories/*.repository.ts`: chỉ query DB/cache gateway
- `dtos/*`: validate input/output contract
- `types/*`: model nghiệp vụ độc lập với DB entity

Kết quả: dễ đọc, dễ debug, tránh “God class”.

### 3.2 DIP

Service phụ thuộc vào **interface/token**, không phụ thuộc class triển khai cụ thể.

Ví dụ:

- Service inject `'IUserRepository'`
- Module map token này sang `UserTypeOrmRepository` bằng `useClass`

Nếu đổi sang raw SQL/Prisma, bạn đổi ở provider wiring, không phải sửa business logic.

---

## 4) Chuẩn đặt tên file/thư mục

- Module: số nhiều theo feature (`users`, `mentorships`)
- DTO: `create-*.dto.ts`, `update-*.dto.ts`, `*-response.dto.ts`
- Interface: `*.repository.interface.ts`
- Repository implementation: `*.typeorm.repository.ts`
- Service: `*.service.ts`
- Business type: `*.type.ts`
- Entity (TypeORM): `*.entity.ts`

Token DI:

- Dùng constant để tránh typo, ví dụ `USER_REPOSITORY_TOKEN`
- Hoặc string rõ nghĩa: `'IUserRepository'`, `'IMentorshipRepository'`

---

## 5) Quy tắc Type để không dính chặt TypeORM

### Khuyến nghị cho dự án cần maintain dài hạn

- **Không dùng trực tiếp** `UserEntity` trong Service
- Chỉ dùng `Entity` ở Repository
- Tạo business type trong `modules/*/types`
- Repository làm nhiệm vụ **mapping** Entity -> business type

Lợi ích:

- Đổi cấu trúc bảng/entity ít ảnh hưởng service/controller
- Kiểm soát tốt boundary giữa business và persistence

---

## 6) Base Repository: dùng khi nào, tránh khi nào

Có thể đặt ở `common/repositories` để giảm lặp CRUD.

Nên dùng cho:

- Bảng master có CRUD chuẩn (`users`, `products`, ...)

Không nên ép dùng cho:

- Bảng trung gian/quan hệ phức tạp (`mentor_mentee`)
- Nơi query đặc thù nhiều hơn CRUD cơ bản

Lý do: tránh vi phạm Interface Segregation (ép class implement method không cần).

---

## 7) Mẫu wiring module theo DIP

1. Định nghĩa interface ở `interfaces/`
2. Viết implementation ở `repositories/`
3. Trong `*.module.ts`:
   - `provide: 'IUserRepository'`
   - `useClass: UserTypeOrmRepository`
4. Service inject token đó

Đây là điểm then chốt giúp bạn thay implementation mà không phá service.

---

## 8) Redis module nên để global

Vì cache thường được dùng ở nhiều nơi, nên để Redis trong `infrastructure/redis` và expose service dùng chung.

Khuyến nghị:

- Wrapper method rõ ràng: `get`, `set`, `del`
- Chuẩn key naming: `entity:scope:id` (vd: `user:profile:12`)
- Gom TTL vào `common/constants`

---

## 9) TypeORM entities tổ chức tập trung

Nên để entities tại `infrastructure/database/entities` thay vì rải từng module, vì:

- Dễ cấu hình `TypeOrmModule.forRoot` và migration
- Quản lý relation tập trung
- Dễ audit schema thay đổi theo thời gian

Khuyến nghị thêm:

- Bật migration thay vì `synchronize: true` ở production
- Dùng naming strategy nhất quán nếu dự án lớn

---

## 10) Luồng request chuẩn (end-to-end)

1. Client gọi API -> Controller
2. Controller validate DTO -> gọi Service
3. Service xử lý nghiệp vụ + cache strategy
4. Service gọi Repository interface
5. Repository implementation query TypeORM
6. Repository map dữ liệu về business type
7. Service trả kết quả -> Controller trả response

Luồng này giữ sạch boundary và dễ unit test từng lớp.

---

## 11) Checklist khi tạo feature mới

- [ ] Tạo `modules/<feature>/`
- [ ] Tạo DTO cho input/output
- [ ] Tạo `types` business độc lập ORM
- [ ] Tạo `interfaces/*repository.interface.ts`
- [ ] Tạo `repositories/*typeorm.repository.ts`
- [ ] Tạo `services/*.service.ts`
- [ ] Tạo `*.controller.ts`
- [ ] Wiring provider token trong `*.module.ts`
- [ ] Khai báo entity vào `TypeOrmModule.forFeature([...])` nếu cần
- [ ] Thêm test cơ bản cho service

---

## 12) Những gì tôi đã chuẩn hóa trong guideline này

1. **Giữ cấu trúc theo Feature Module** để scale tự nhiên khi thêm domain mới.
2. **Tách infrastructure khỏi modules** để tránh business logic dính công nghệ.
3. **Áp dụng DIP bằng interface + token provider** đúng style NestJS.
4. **Tách business type khỏi TypeORM entity** để tăng khả năng bảo trì dài hạn.
5. **Đưa Base Repository vào vị trí tùy chọn, có điều kiện** để không lạm dụng generic.
6. **Thêm naming convention + checklist triển khai** để team code đồng nhất.

---

## 13) Kết luận

Đây là cấu trúc cân bằng tốt giữa:

- Tính thực dụng (không quá nặng như DDD full)
- Độ sạch kiến trúc (SOLID, đặc biệt SRP + DIP)
- Khả năng mở rộng và thay đổi công nghệ trong tương lai

Nếu bạn muốn, bước tiếp theo tôi có thể tạo thêm một **project skeleton thực tế** (module `users` + `mentorships` + TypeORM provider + Redis) theo đúng guideline này để bạn chạy ngay.