import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const queryListUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  profile_image_url: z.string(),
  groups: z.array(z.number().int()),
  updated_at: z.string(),
  created_at: z.string(),
  disabled_at: z.string().nullable(),
  is_disabled: z.boolean(),
  is_invitation_pending: z.boolean(),
  is_email_verified: z.boolean(),
  auth_type: z.string(),
});

export const visualizationItemSchema = z.object({
  id: z.number().int(),
  type: z.string(),
  query_id: z.number().int(),
  name: z.string(),
  description: z.string().nullable(),
  options: z.record(z.string(), z.unknown()),
  updated_at: z.string(),
  created_at: z.string(),
});

export const queryListItemSchema = z.object({
  id: z.number().int(),
  latest_query_data_id: z.number().int().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  query: z.string(),
  query_hash: z.string(),
  schedule: z.record(z.string(), z.unknown()).nullable(),
  api_key: z.string(),
  is_archived: z.boolean(),
  is_draft: z.boolean(),
  updated_at: z.string(),
  created_at: z.string(),
  data_source_id: z.number().int().nullable(),
  options: z.record(z.string(), z.unknown()),
  version: z.number().int(),
  tags: z.array(z.string()),
  is_safe: z.boolean(),
  user: queryListUserSchema.nullable(),
  last_modified_by: queryListUserSchema.nullable(),
  last_modified_by_id: z.number().int().nullable(),
  retrieved_at: z.string().nullable(),
  runtime: z.number().nullable(),
  is_favorite: z.boolean(),
});

export const queryListResponseSchema = z.object({
  count: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
  results: z.array(queryListItemSchema),
});

export class QueryListResponseDto extends createZodDto(
  queryListResponseSchema,
) {}
