import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

const adminQueueSizeSchema = z.object({
  size: z.number().int().nonnegative(),
});

const adminManagerStatusSchema = z.object({
  last_refresh_at: z.number().nullable(),
  outdated_queries_count: z.number().int().nonnegative(),
  queues: z.record(z.string(), adminQueueSizeSchema),
  started_at: z.number().nullable(),
});

const databaseMetricSchema = z.tuple([z.string(), z.number().nonnegative()]);

export const adminStatusResponseSchema = z.object({
  dashboards_count: z.number().int().nonnegative(),
  database_metrics: z.object({
    metrics: z.array(databaseMetricSchema),
  }),
  manager: adminManagerStatusSchema,
  queries_count: z.number().int().nonnegative(),
  query_results_count: z.number().int().nonnegative(),
  redis_used_memory: z.number().int().nonnegative(),
  redis_used_memory_human: z.string(),
  unused_query_results_count: z.number().int().nonnegative(),
  version: z.string(),
  widgets_count: z.number().int().nonnegative(),
});

export class AdminStatusResponseDto extends createZodDto(
  adminStatusResponseSchema,
) {}
