import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const adminOutdatedQueryUserSchema = z
  .object({
    id: z.number().int(),
    name: z.string(),
    profile_image_url: z.string(),
  })
  .nullable();

export const adminOutdatedQueryItemSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  schedule: z.record(z.string(), z.unknown()).nullable(),
  is_archived: z.boolean(),
  is_draft: z.boolean(),
  tags: z.array(z.string()),
  created_at: z.string(),
  user: adminOutdatedQueryUserSchema,
  retrieved_at: z.string().nullable(),
  runtime: z.number().nullable(),
});

export const adminOutdatedQueriesResponseSchema = z.object({
  queries: z.array(adminOutdatedQueryItemSchema),
  updated_at: z.number().nullable(),
});

export class AdminOutdatedQueriesResponseDto extends createZodDto(
  adminOutdatedQueriesResponseSchema,
) {}
