import { z } from 'zod';

export const userSchema = z.object({
  name: z.string().min(1),
});

export type UserSchema = z.infer<typeof userSchema>;
