import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(128),
  orgSlug: z.string().trim().min(1).max(255).default('default'),
});

export class LoginDto extends createZodDto(loginSchema) {}
