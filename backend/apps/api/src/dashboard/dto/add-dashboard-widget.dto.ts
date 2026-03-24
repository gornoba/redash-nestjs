import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dashboardIdParamSchema = z.object({
  dashboardId: z.coerce.number().int().positive(),
});

export class DashboardIdParamDto extends createZodDto(dashboardIdParamSchema) {}

export const addDashboardWidgetRequestSchema = z.object({
  visualization_id: z.number().int().positive(),
});

export class AddDashboardWidgetRequestDto extends createZodDto(
  addDashboardWidgetRequestSchema,
) {}

export const addDashboardWidgetResponseSchema = z.object({
  id: z.number().int(),
  visualization_id: z.number().int().nullable(),
  dashboard_id: z.number().int(),
  width: z.number().int(),
  options: z.record(z.string(), z.unknown()),
  text: z.string().nullable(),
  updated_at: z.string(),
  created_at: z.string(),
});

export class AddDashboardWidgetResponseDto extends createZodDto(
  addDashboardWidgetResponseSchema,
) {}
