# Tài liệu Kỹ thuật: Triển khai Global Authentication Guard (Bảo mật mặc định)

## 1. Tổng quan
Tài liệu này đề xuất chiến lược "Secure by Default" (Bảo mật mặc định) cho dự án NestJS. Thay vì áp dụng Guard thủ công cho từng Controller hoặc Endpoint, chúng ta sẽ triển khai một Global Authentication Guard để bảo vệ tất cả các route theo mặc định, và chỉ bỏ qua các API công khai khi được đánh dấu cụ thể.

## 2. Vấn đề hiện tại
Trong các ứng dụng NestJS thông thường, lập trình viên thường sử dụng decorator `@UseGuards(AuthGuard)` tại từng Controller hoặc Method. Cách tiếp cận này có một số nhược điểm:
- **Lỗi con người**: Lập trình viên có thể quên thêm Guard cho API mới, dẫn đến lỗ hổng bảo mật.
- **Dư thừa mã (Boilerplate)**: Lặp đi lặp lại mã khai báo Guard ở nhiều nơi.
- **Thiếu nhất quán**: Các Controller khác nhau có thể cấu hình Guard khác nhau nếu không được quản lý chặt chẽ.

## 3. Giải pháp đề xuất
Triển khai một **Global Authentication Guard** được đăng ký trong `AppModule`. Guard này sẽ:
1. Chặn mọi Request gửi đến hệ thống.
2. Kiểm tra xem Route đó có được đánh dấu là "Public" (Công khai) bằng một metadata decorator tùy chỉnh hay không.
3. Nếu là công khai, cho phép truy cập ngay lập tức.
4. Nếu không, thực hiện logic xác thực (ví dụ: kiểm tra JWT).

### 3.1 Custom Decorator: `@PublicSource()`
Một decorator chuyên dụng để đánh dấu các Route hoặc toàn bộ Controller có thể truy cập mà không cần xác thực.

### 3.2 Đăng ký Toàn cục (Global Registration)
Việc đăng ký Guard như một Provider trong `AppModule` sử dụng token `APP_GUARD` đảm bảo nó được áp dụng cho tất cả các Module trong ứng dụng.

## 4. Chi tiết triển khai

### 4.1 Bước 1: Tạo Decorator
Định nghĩa một key hằng số và hàm decorator để thiết lập metadata.

```typescript
import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const PublicSource = () => SetMetadata(IS_PUBLIC_KEY, true);
```

### 4.2 Bước 2: Tạo Global Guard
Guard sử dụng `Reflector` để đọc metadata từ cả handler (method) và class (controller).

```typescript
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public-source.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Chèn logic xác thực JWT tại đây (ví dụ: sử dụng Passport hoặc logic tùy chỉnh)
    // const request = context.switchToHttp().getRequest();
    // const user = await this.validateToken(request);
    // if (!user) throw new UnauthorizedException('Bạn cần đăng nhập');
    
    return true; // Thay thế bằng kết quả xác thực thực tế
  }
}
```

### 4.3 Bước 3: Đăng ký trong AppModule
Đăng ký Guard toàn cục trong file `app.module.ts`.

```typescript
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/auth.guard';

@Module({
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
```

## 5. Ví dụ sử dụng

### Được bảo mật mặc định
```typescript
@Controller('users')
export class UserController {
  @Get()
  findAll() {
    // API này tự động được bảo vệ, yêu cầu token
  }
}
```

### Đánh dấu công khai (Public)
```typescript
@Controller('auth')
export class AuthController {
  @PublicSource()
  @Post('login')
  login() {
    // API này có thể truy cập mà không cần token
  }
}
```

## 6. Lợi ích
- **Bảo mật**: Cơ chế "Secure by Default" giúp ngăn chặn việc vô tình lộ các API nhạy cảm.
- **Dễ bảo trì**: Logic xác thực được tập trung tại một nơi duy nhất.
- **Dễ đọc**: Phân biệt rõ ràng giữa Route công khai và nội bộ thông qua decorator `@PublicSource()`.

## 7. Kết luận
Giải pháp này rất phù hợp cho các dự án mà đa số các API đều yêu cầu xác thực. Nó tuân thủ các nguyên tắc bảo mật tốt nhất và giảm bớt gánh nặng cho lập trình viên.
