import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const dashboardRefreshIdParamSchema = z.object({
  dashboardRefreshId: z.string().uuid(),
});

export class DashboardRefreshIdParamDto extends createZodDto(
  dashboardRefreshIdParamSchema,
) {}

const dashboardRefreshStateSchema = z.enum([
  'queued',
  'running',
  'completed',
  'failed',
]);

export const dashboardRefreshResponseSchema = z.object({
  dashboard_id: z.number().int(),
  dashboard_refresh_id: z.string().uuid(),
  state: z.enum(['queued', 'completed']),
  total_jobs: z.number().int().nonnegative(),
});

export class DashboardRefreshResponseDto extends createZodDto(
  dashboardRefreshResponseSchema,
) {}

export const dashboardRefreshStatusResponseSchema = z.object({
  completed_jobs: z.number().int().nonnegative(),
  dashboard_id: z.number().int(),
  dashboard_refresh_id: z.string().uuid(),
  error: z.string().nullable(),
  failed_jobs: z.number().int().nonnegative(),
  state: dashboardRefreshStateSchema,
  total_jobs: z.number().int().nonnegative(),
});

export class DashboardRefreshStatusResponseDto extends createZodDto(
  dashboardRefreshStatusResponseSchema,
) {}
