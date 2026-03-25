import { z } from 'zod';

export const example-2Schema = z.object({
  name: z.string().min(1),
});

export type Example2Schema = z.infer<typeof example-2Schema>;

