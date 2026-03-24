import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const createSetupSchema = z.object({
  name: z.string().trim().min(1).max(320),
  email: z
    .string()
    .trim()
    .email()
    .max(320)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(6).max(128),
  orgName: z.string().trim().min(1).max(255),
  securityNotifications: z.boolean(),
  newsletter: z.boolean(),
});

export class CreateSetupDto extends createZodDto(createSetupSchema) {}
