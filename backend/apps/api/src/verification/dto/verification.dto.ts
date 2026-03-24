import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const verificationEmailResponseSchema = z.object({
  message: z.string(),
});

export class VerificationEmailResponseDto extends createZodDto(
  verificationEmailResponseSchema,
) {}

export const verifyEmailParamsSchema = z.object({
  token: z.string().min(1),
});

export class VerifyEmailParamsDto extends createZodDto(
  verifyEmailParamsSchema,
) {}

export const verifyEmailResponseSchema = z.object({
  message: z.string(),
});

export class VerifyEmailResponseDto extends createZodDto(
  verifyEmailResponseSchema,
) {}
