import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const dashboardListUserSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string().email(),
  profile_image_url: z.string(),
});

export const dashboardListItemSchema = z.object({
  id: z.number().int(),
  slug: z.string(),
  url: z.string(),
  name: z.string(),
  user_id: z.number().int(),
  user: dashboardListUserSchema.nullable(),
  layout: z.array(z.record(z.string(), z.unknown())),
  dashboard_filters_enabled: z.boolean(),
  options: z.record(z.string(), z.unknown()),
  is_archived: z.boolean(),
  is_draft: z.boolean(),
  updated_at: z.string(),
  created_at: z.string(),
  version: z.number().int(),
  is_favorite: z.boolean(),
  tags: z.array(z.string()),
});

export const dashboardListResponseSchema = z.object({
  count: z.number().int(),
  page: z.number().int(),
  page_size: z.number().int(),
  results: z.array(dashboardListItemSchema),
});

export class DashboardListResponseDto extends createZodDto(
  dashboardListResponseSchema,
) {}

export class DashboardListItemResponseDto extends createZodDto(
  dashboardListItemSchema,
) {}
