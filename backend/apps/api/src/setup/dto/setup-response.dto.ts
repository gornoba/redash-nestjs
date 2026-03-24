import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const setupStateResponseSchema = z.object({
  isSetupRequired: z.boolean(),
  defaults: z.object({
    securityNotifications: z.boolean(),
    newsletter: z.boolean(),
  }),
});

export class SetupStateResponseDto extends createZodDto(
  setupStateResponseSchema,
) {}

export const createSetupResponseSchema = z.object({
  message: z.string(),
  organization: z.object({
    id: z.number().int(),
    name: z.string(),
    slug: z.string(),
  }),
  user: z.object({
    id: z.number().int(),
    name: z.string(),
    email: z.string().email(),
  }),
});

export class CreateSetupResponseDto extends createZodDto(
  createSetupResponseSchema,
) {}
