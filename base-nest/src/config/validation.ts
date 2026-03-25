/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { z } from 'zod';

export const envSchema = z
  .object({
    NODE_ENV: z
      .enum(['development', 'test', 'production'])
      .default('development'),
    PORT: z.coerce.number().default(3000),
    API_PREFIX: z.string().default('api/v1'),

    DATABASE_URL: z.string().url().optional(),

    DB_HOST: z.string().optional(),
    DB_PORT: z.coerce.number().optional(),
    DB_USER: z.string().optional(),
    DB_PASSWORD: z.string().optional(),
    DB_NAME: z.string().optional(),
    DB_SSL: z.coerce.boolean().default(false),
  })
  .superRefine((data: any, ctx: any) => {
    if (!data.DATABASE_URL) {
      const required = [
        'DB_HOST',
        'DB_PORT',
        'DB_USER',
        'DB_PASSWORD',
        'DB_NAME',
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
