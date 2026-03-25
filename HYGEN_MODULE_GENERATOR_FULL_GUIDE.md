# Hướng dẫn đầy đủ: Tự build Hygen Generator cho NestJS module structure

Tài liệu này ghi lại toàn bộ cách mình đã setup Hygen cho `sample-project`, để sau này bạn có thể tự dựng lại từ đầu, copy sang project khác, hoặc mở rộng theo convention team.

## 1) Mục tiêu

Sinh nhanh module có cấu trúc đầy đủ:

- `dtos/`
- `entities/`
- `interfaces/`
- `repositories/`
- `services/`
- `types/`
- `schema/`
- `<module>.controller.ts`
- `<module>.module.ts`

## 2) Cài đặt

```bash
npm i -D hygen
```

## 3) Cấu trúc thư mục Hygen

```text
_templates/
└─ module/
   └─ new/
      ├─ prompt.js
      ├─ module.ejs.t
      ├─ controller.ejs.t
      ├─ service.ejs.t
      ├─ entity.ejs.t
      ├─ dto.ejs.t
      ├─ interface.ejs.t
      ├─ repository.ejs.t
      ├─ type.ejs.t
      └─ schema.ejs.t
```

## 4) Nội dung `prompt.js`

```js
const toPascalCase = (value) =>
  value
    .split(/[^a-zA-Z0-9]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

module.exports = {
  prompt: async ({ inquirer, args }) => {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Tên module (số ít, ví dụ: user):",
        initial: args.name,
        validate: (value) =>
          value && value.trim().length > 0
            ? true
            : "Vui lòng nhập tên module hợp lệ",
      },
      {
        type: "input",
        name: "route",
        message: "Route prefix (mặc định dùng tên module dạng số nhiều):",
        initial: args.route,
      },
    ]);

    const normalizedName = answers.name.trim().toLowerCase();
    const pluralName = normalizedName.endsWith("s")
      ? normalizedName
      : `${normalizedName}s`;

    return {
      ...answers,
      name: normalizedName,
      className: toPascalCase(normalizedName),
      route:
        answers.route && answers.route.trim().length > 0
          ? answers.route.trim().toLowerCase()
          : pluralName,
      pluralName,
    };
  },
};
```

## 5) Các template `.ejs.t` (đầy đủ nội dung)

### `module.ejs.t`

```ejs
---
to: src/modules/<%= name %>/<%= name %>.module.ts
---
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { <%= className %>Controller } from './<%= name %>.controller';
import { <%= className %>Service } from './services/<%= name %>.service';
import { <%= className %>Entity } from './entities/<%= name %>.entity';

@Module({
  imports: [TypeOrmModule.forFeature([<%= className %>Entity])],
  controllers: [<%= className %>Controller],
  providers: [<%= className %>Service],
  exports: [<%= className %>Service],
})
export class <%= className %>Module {}
```

### `controller.ejs.t`

```ejs
---
to: src/modules/<%= name %>/<%= name %>.controller.ts
---
import { Controller, Get, Param } from '@nestjs/common';
import { <%= className %>Service } from './services/<%= name %>.service';

@Controller('<%= route %>')
export class <%= className %>Controller {
  constructor(private readonly <%= name %>Service: <%= className %>Service) {}

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.<%= name %>Service.findOne(id);
  }
}
```

### `service.ejs.t`

```ejs
---
to: src/modules/<%= name %>/services/<%= name %>.service.ts
---
import { Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class <%= className %>Service {
  async findOne(id: string) {
    if (!id) {
      throw new NotFoundException('<%= className %> id is required');
    }

    return {
      id,
      message: '<%= className %> fetched successfully',
    };
  }
}
```

### `entity.ejs.t`

```ejs
---
to: src/modules/<%= name %>/entities/<%= name %>.entity.ts
---
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity({ name: '<%= pluralName %>' })
export class <%= className %>Entity extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;
}
```

### `dto.ejs.t`

```ejs
---
to: src/modules/<%= name %>/dtos/<%= name %>.dto.ts
---
import { IsString, IsNotEmpty } from 'class-validator';

export class <%= className %>Dto {
  @IsString()
  @IsNotEmpty()
  name: string;
}
```

### `interface.ejs.t`

```ejs
---
to: src/modules/<%= name %>/interfaces/<%= name %>.service.interface.ts
---
export interface I<%= className %>Service {
  findOne(id: string): Promise<unknown>;
}
```

### `repository.ejs.t`

```ejs
---
to: src/modules/<%= name %>/repositories/<%= name %>.repository.ts
---
import { Injectable } from '@nestjs/common';

@Injectable()
export class <%= className %>Repository {}
```

### `type.ejs.t`

```ejs
---
to: src/modules/<%= name %>/types/<%= name %>.types.ts
---
export type <%= className %>Id = string;
```

### `schema.ejs.t`

```ejs
---
to: src/modules/<%= name %>/schema/<%= name %>.schema.ts
---
export type <%= className %>Schema = {
  name: string;
};

export const <%= name %>Schema = {
  parse: <T>(payload: T) => payload,
};
```

## 6) Script chạy ngắn gọn

Trong `package.json`:

```json
{
  "scripts": {
    "hygen": "hygen",
    "gen:module": "node scripts/gen-module.js"
  }
}
```

Tạo file `scripts/gen-module.js`:

```js
#!/usr/bin/env node

const { spawnSync } = require("node:child_process");

const inputName = process.argv[2];

if (!inputName) {
  console.error("Usage: npm run gen:module -- <module-name> [route]");
  process.exit(1);
}

const name = inputName.trim().toLowerCase();
const routeArg = process.argv[3];
const route =
  routeArg && routeArg.trim().length > 0
    ? routeArg.trim().toLowerCase()
    : `${name}${name.endsWith("s") ? "" : "s"}`;

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["hygen", "module", "new", "--name", name, "--route", route],
  { stdio: "inherit", shell: process.platform === "win32" }
);

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
```

## 7) Cách dùng

```bash
npm run gen:module -- user
```

hoặc custom route:

```bash
npm run gen:module -- user accounts
```

## 8) Port sang project khác

1. Cài `hygen`
2. Copy `_templates/module/new`
3. Copy `scripts/gen-module.js`
4. Thêm script `gen:module`
5. Chạy test generate 1 module mẫu
