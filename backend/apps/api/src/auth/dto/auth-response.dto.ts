import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const authenticatedUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  orgId: z.number().int(),
  orgSlug: z.string(),
  groupIds: z.array(z.number().int()),
  roles: z.array(z.string()),
  permissions: z.array(z.string()),
  profileImageUrl: z.string(),
  isEmailVerified: z.boolean(),
});

export const loginResponseSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal('Bearer'),
  expiresIn: z.string(),
  user: authenticatedUserSchema,
});

export class LoginResponseDto extends createZodDto(loginResponseSchema) {}

export const logoutResponseSchema = z.object({
  message: z.string(),
});

export class LogoutResponseDto extends createZodDto(logoutResponseSchema) {}
